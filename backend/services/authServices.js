import User from "../models/User.js";
import bcrypt from "bcryptjs";

import { generateOTP, sendEmail } from "../utils/sendEmail.js";

import { Otp } from "../models/Otp.js";

// ✅ REGISTER
export const registerUser = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("User already registered");
    error.statusCode = 400;
    throw error;
  }

  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    const error = new Error("Please verify OTP first");
    error.statusCode = 400;
    throw error;
  }

  if (!otpRecord.isVerified) {
    const error = new Error("OTP not verified");
    error.statusCode = 400;
    throw error;
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({
    name: name || email.split("@")[0],
    email,
    password: hashedPassword,
    role,
    isVerified: true,
    approvalStatus: role === "instructor" ? "unverified" : "approved",
  });

  await user.save();

  // Clean up OTP record
  await Otp.findOneAndDelete({ email });

  return user;
};

// ✅ REQUEST OTP
export const requestOtpService = async (email) => {
  const existingUser = await User.findOne({ email, isVerified: true, password: { $exists: true } });

  if (existingUser) {
    const error = new Error("User already registered");
    error.statusCode = 400;
    throw error;
  }

  const otp = generateOTP();

  await sendEmail(email, "Your OTP Code", `Your OTP is ${otp}`);

  await Otp.findOneAndUpdate(
    { email },
    { otp, isVerified: false, expirydate: new Date() },
    { upsert: true, new: true }
  );

  return { message: "OTP sent successfully" };
};

// ✅ LOGIN
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

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

// ✅ VERIFY OTP
export const verifyOtpService = async ({ email, otp }) => {
  if (!email || !otp) {
    const error = new Error("Email and OTP are required");
    error.statusCode = 400;
    throw error;
  }

  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    const error = new Error("OTP request not found. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  // Convert both to strings and trim to ensure clean comparison
  const storedOtp = String(otpRecord.otp).trim();
  const incomingOtp = String(otp).trim();

  if (storedOtp !== incomingOtp) {
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    throw error;
  }

  // 3 minute expiry check
  if (!otpRecord.expirydate) {
    await Otp.findOneAndDelete({ email });
    const error = new Error("OTP configuration error. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  const currentTime = Date.now();
  const timeDifference = currentTime - otpRecord.expirydate.getTime();

  if (timeDifference > 3 * 60 * 1000) {
    await Otp.findOneAndDelete({ email });
    const error = new Error("OTP expired");
    error.statusCode = 400;
    throw error;
  }

  otpRecord.isVerified = true;
  await otpRecord.save();

  return { message: "OTP verified successfully" };
};

// ✅ RESEND OTP
export const resendOtpService = async (email) => {
  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    const error = new Error("OTP request not found. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  const otp = generateOTP();

  otpRecord.otp = otp;
  otpRecord.expirydate = new Date();
  otpRecord.isVerified = false;

  await otpRecord.save();

  await sendEmail(email, "New OTP", `Your OTP is ${otp}`);

  return { message: "OTP resent successfully" };
};
