import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { generateOTP, sendEmail } from "../utils/sendEmail.js";
import redisClient from "../config/redis.js";
import { env } from "../config/env.config.js";
import {
  buildAdminInstructorRegistrationEmail,
  buildInstructorRegistrationConfirmationEmail,
} from "../utils/instructorRegistrationEmails.js";

const OTP_TTL_SECONDS = 5 * 60;
const OTP_VERIFIED_TTL_SECONDS = 10 * 60;
const OTP_ATTEMPT_TTL_SECONDS = OTP_TTL_SECONDS;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_TTL_SECONDS = 15 * 60;
const OTP_EMAIL_RATE_LIMIT = 3;
const OTP_IP_RATE_LIMIT = 10;

const normalizeEmail = (email) =>
  String(email || "").toLowerCase().trim();

const hashValue = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");

const getEmailHash = (email) => hashValue(normalizeEmail(email));
const getIpHash = (ip) => hashValue(String(ip || "unknown"));

const getOtpSecret = () => {
  const secret = process.env.OTP_SECRET;

  if (!secret || secret.trim().length < 32) {
    const error = new Error(
      "OTP service is not configured. Please contact support."
    );
    error.statusCode = 500;
    throw error;
  }

  return secret;
};

const createOtpDigest = (email, otp) =>
  crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${normalizeEmail(email)}:${String(otp).trim()}`)
    .digest("hex");

const safeCompare = (expected, incoming) => {
  const expectedBuffer = Buffer.from(String(expected || ""), "hex");
  const incomingBuffer = Buffer.from(String(incoming || ""), "hex");

  if (expectedBuffer.length !== incomingBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
};

const getOtpKeys = (email, ip) => {
  const emailHash = getEmailHash(email);
  const ipHash = getIpHash(ip);

  return {
    otpKey: `auth:otp:${emailHash}`,
    attemptsKey: `auth:otp-attempts:${emailHash}`,
    verifiedKey: `auth:otp-verified:${emailHash}`,
    emailRateKey: `auth:otp-rate:${emailHash}`,
    ipRateKey: `auth:otp-ip-rate:${ipHash}`,
  };
};

const incrementWithFixedWindow = async (key, ttlSeconds) => {
  const script = `
    local count = redis.call("INCR", KEYS[1])
    if count == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("TTL", KEYS[1])
    return { count, ttl }
  `;

  const result = await redisClient.eval(script, {
    keys: [key],
    arguments: [String(ttlSeconds)],
  });

  return {
    count: Number(result[0]),
    ttl: Number(result[1]),
  };
};

const applyOtpRateLimits = async ({ email, ip }) => {
  const { emailRateKey, ipRateKey } = getOtpKeys(email, ip);

  const emailRate = await incrementWithFixedWindow(
    emailRateKey,
    OTP_RATE_TTL_SECONDS
  );

  if (emailRate.count > OTP_EMAIL_RATE_LIMIT) {
    const error = new Error(
      `Too many OTP requests. Please try again in ${Math.ceil(
        Math.max(emailRate.ttl, 1) / 60
      )} minute(s).`
    );
    error.statusCode = 429;
    throw error;
  }

  const ipRate = await incrementWithFixedWindow(
    ipRateKey,
    OTP_RATE_TTL_SECONDS
  );

  if (ipRate.count > OTP_IP_RATE_LIMIT) {
    const error = new Error(
      `Too many OTP requests from this network. Please try again in ${Math.ceil(
        Math.max(ipRate.ttl, 1) / 60
      )} minute(s).`
    );
    error.statusCode = 429;
    throw error;
  }
};

const storeNewOtp = async ({ email, otp }) => {
  const { otpKey, attemptsKey, verifiedKey } = getOtpKeys(email);
  const otpDigest = createOtpDigest(email, otp);

  await redisClient
    .multi()
    .set(otpKey, otpDigest, { EX: OTP_TTL_SECONDS })
    .del(attemptsKey)
    .del(verifiedKey)
    .exec();
};

const removeOtpState = async (email) => {
  const { otpKey, attemptsKey } = getOtpKeys(email);
  await redisClient.del([otpKey, attemptsKey]);
};

const sendInstructorRegistrationNotifications = async (user) => {
  if (user.role !== "instructor") {
    return;
  }

  const adminEmail = buildAdminInstructorRegistrationEmail(user);
  const instructorEmail =
    buildInstructorRegistrationConfirmationEmail(user);

  const results = await Promise.allSettled([
    sendEmail(
      env.ADMIN_NOTIFICATION_EMAIL,
      adminEmail.subject,
      adminEmail.html,
      adminEmail.text
    ),
    sendEmail(
      user.email,
      instructorEmail.subject,
      instructorEmail.html,
      instructorEmail.text
    ),
  ]);

  if (results[0].status === "rejected") {
    console.error(
      "Instructor registration admin notification email failed"
    );
  }

  if (results[1].status === "rejected") {
    console.error(
      "Instructor registration confirmation email failed"
    );
  }
};

export const registerUser = async ({ name, email, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  const publicRoles = ["student", "instructor"];

  if (!normalizedEmail || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  if (!publicRoles.includes(role)) {
    const error = new Error("Invalid registration role");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("User already registered");
    error.statusCode = 400;
    throw error;
  }

  const { verifiedKey } = getOtpKeys(normalizedEmail);
  const verifiedState = await redisClient.get(verifiedKey);

  if (!verifiedState) {
    const error = new Error("Please verify OTP first");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({
    name: name || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    password: hashedPassword,
    role,
    isVerified: true,
    approvalStatus: role === "instructor" ? "pending" : "approved",
    authProviders: ["password"],
  });

  await user.save();
  await redisClient.del(verifiedKey);
  await sendInstructorRegistrationNotifications(user);

  return user;
};

export const requestOtpService = async ({ email, ip }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
    isVerified: true,
    password: { $exists: true },
  });

  if (existingUser) {
    const error = new Error("User already registered");
    error.statusCode = 400;
    throw error;
  }

  await applyOtpRateLimits({ email: normalizedEmail, ip });

  const otp = generateOTP();
  await storeNewOtp({ email: normalizedEmail, otp });

  try {
    await sendEmail(
      normalizedEmail,
      "Your OTP Code",
      `Your OTP is ${otp}`
    );
  } catch (error) {
    await removeOtpState(normalizedEmail);
    throw error;
  }

  return { message: "OTP sent successfully" };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.password) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error("Please verify your account first");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return user;
};

export const loginUserForRole = async ({ email, password, portalRole }) => {
  const user = await loginUser({ email, password });

  if (user.role !== portalRole) {
    const error = new Error(
      `This account is registered as ${user.role}. Please use the ${user.role} login page.`
    );
    error.statusCode = 403;
    error.code = "ROLE_MISMATCH";
    error.registeredRole = user.role;
    throw error;
  }

  if (user.isBlocked) {
    const error = new Error(
      user.blockedReason || "Your account has been blocked."
    );
    error.statusCode = 403;
    error.code = "ACCOUNT_BLOCKED";
    throw error;
  }

  return user;
};

export const verifyOtpService = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !otp) {
    const error = new Error("Email and OTP are required");
    error.statusCode = 400;
    throw error;
  }

  const { otpKey, attemptsKey, verifiedKey } = getOtpKeys(normalizedEmail);
  const storedOtpDigest = await redisClient.get(otpKey);

  if (!storedOtpDigest) {
    const error = new Error("OTP request not found. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  const incomingOtpDigest = createOtpDigest(normalizedEmail, otp);

  if (!safeCompare(storedOtpDigest, incomingOtpDigest)) {
    const attempts = await incrementWithFixedWindow(
      attemptsKey,
      OTP_ATTEMPT_TTL_SECONDS
    );

    if (attempts.count >= OTP_MAX_ATTEMPTS) {
      await redisClient.del([otpKey, attemptsKey]);

      const error = new Error(
        "Too many incorrect OTP attempts. Please request a new code."
      );
      error.statusCode = 400;
      throw error;
    }

    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    throw error;
  }

  await redisClient
    .multi()
    .del(otpKey)
    .del(attemptsKey)
    .set(verifiedKey, "verified", { EX: OTP_VERIFIED_TTL_SECONDS })
    .exec();

  return { message: "OTP verified successfully" };
};

export const resendOtpService = async ({ email, ip }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const { otpKey } = getOtpKeys(normalizedEmail);
  const existingOtp = await redisClient.get(otpKey);

  if (!existingOtp) {
    const error = new Error("OTP request not found. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  await applyOtpRateLimits({ email: normalizedEmail, ip });

  const otp = generateOTP();
  await storeNewOtp({ email: normalizedEmail, otp });

  try {
    await sendEmail(normalizedEmail, "New OTP", `Your OTP is ${otp}`);
  } catch (error) {
    await removeOtpState(normalizedEmail);
    throw error;
  }

  return { message: "OTP resent successfully" };
};
