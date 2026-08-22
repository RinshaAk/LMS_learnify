import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

const originalOtpSecret = process.env.OTP_SECRET;
const originalEmailUser = process.env.EMAIL_USER;
const originalEmailPass = process.env.EMAIL_PASS;
const originalAdminNotificationEmail =
  process.env.ADMIN_NOTIFICATION_EMAIL;

process.env.OTP_SECRET =
  "test-only-otp-secret-that-is-long-enough-for-hmac";
process.env.EMAIL_USER = "test@example.com";
process.env.EMAIL_PASS = "test-email-password";
process.env.ADMIN_NOTIFICATION_EMAIL = "admin-notify@example.com";

const sentEmails = [];
const attemptedEmails = [];
let failNextEmail = false;
const failSubjects = new Set();

nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    attemptedEmails.push(message);

    if (failSubjects.has(message.subject)) {
      const error = new Error("mock email failure");
      error.code = "EMOCK";
      throw error;
    }

    if (failNextEmail) {
      failNextEmail = false;
      const error = new Error("mock email failure");
      error.code = "EMOCK";
      throw error;
    }

    sentEmails.push(message);
    return { messageId: `mock-${sentEmails.length}` };
  },
});

const redisModule = await import("../config/redis.js");
const redisClient = redisModule.default;
const {
  requestOtpService,
  resendOtpService,
  verifyOtpService,
  registerUser,
} = await import("../services/authServices.js");
const userModule = await import("../models/User.js");
const User = userModule.default;

const savedUsers = new Map();
const originalFindOne = User.findOne.bind(User);
const originalSave = User.prototype.save;

User.findOne = async (query) => savedUsers.get(query.email) || null;

User.prototype.save = async function saveMockUser() {
  savedUsers.set(this.email, this);
  return this;
};

const normalizeEmail = (email) => String(email).toLowerCase().trim();

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const keysFor = (email, ip = "127.0.0.1") => {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashValue(normalizedEmail);
  const ipHash = hashValue(ip);

  return {
    normalizedEmail,
    otpKey: `auth:otp:${emailHash}`,
    attemptsKey: `auth:otp-attempts:${emailHash}`,
    verifiedKey: `auth:otp-verified:${emailHash}`,
    emailRateKey: `auth:otp-rate:${emailHash}`,
    ipRateKey: `auth:otp-ip-rate:${ipHash}`,
  };
};

const cleanupEmail = async (email, ip = "127.0.0.1") => {
  const keys = keysFor(email, ip);
  await redisClient.del([
    keys.otpKey,
    keys.attemptsKey,
    keys.verifiedKey,
    keys.emailRateKey,
    keys.ipRateKey,
  ]);
  savedUsers.delete(keys.normalizedEmail);
};

const latestOtp = () => {
  const otpEmail = [...sentEmails]
    .reverse()
    .find((message) => message.subject.includes("OTP"));
  const html = otpEmail?.html || "";
  const match = html.match(/\b\d{6}\b/);
  assert.ok(match, "mocked email should contain a six-digit OTP");
  return match[0];
};

const expectReject = async (promise, statusCode) => {
  try {
    await promise;
    assert.fail("expected promise to reject");
  } catch (error) {
    assert.equal(error.statusCode, statusCode);
    return error;
  }
};

test.before(async () => {
  await redisModule.connectRedis();
});

test.after(async () => {
  User.findOne = originalFindOne;
  User.prototype.save = originalSave;
  await redisModule.disconnectRedis();

  if (originalOtpSecret === undefined) {
    delete process.env.OTP_SECRET;
  } else {
    process.env.OTP_SECRET = originalOtpSecret;
  }

  if (originalEmailUser === undefined) {
    delete process.env.EMAIL_USER;
  } else {
    process.env.EMAIL_USER = originalEmailUser;
  }

  if (originalEmailPass === undefined) {
    delete process.env.EMAIL_PASS;
  } else {
    process.env.EMAIL_PASS = originalEmailPass;
  }

  if (originalAdminNotificationEmail === undefined) {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
  } else {
    process.env.ADMIN_NOTIFICATION_EMAIL =
      originalAdminNotificationEmail;
  }
});

test.afterEach(() => {
  sentEmails.length = 0;
  attemptedEmails.length = 0;
  failNextEmail = false;
  failSubjects.clear();
});

test("missing OTP_SECRET fails safely before sending email", async () => {
  const email = "Redis.Otp.MissingSecret@example.com";
  const ip = "10.20.30.39";
  const originalSecret = process.env.OTP_SECRET;
  await cleanupEmail(email, ip);

  delete process.env.OTP_SECRET;

  const error = await expectReject(
    requestOtpService({ email, ip }),
    500
  );

  assert.match(error.message, /OTP service is not configured/);
  assert.equal(sentEmails.length, 0);

  process.env.OTP_SECRET = originalSecret;
  await cleanupEmail(email, ip);
});

test("stores OTP as HMAC with five-minute TTL and hashed Redis key", async () => {
  const email = "Redis.Otp.Stored@example.com";
  const ip = "10.20.30.40";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });

  const otp = latestOtp();
  const stored = await redisClient.get(keys.otpKey);
  const ttl = await redisClient.ttl(keys.otpKey);

  assert.ok(stored, "OTP digest should exist in Redis");
  assert.notEqual(stored, otp);
  assert.equal(stored.length, 64);
  assert.ok(ttl > 0 && ttl <= 300);
  assert.ok(ttl >= 295, `expected TTL close to 300 seconds, got ${ttl}`);
  assert.equal(keys.otpKey.includes(keys.normalizedEmail), false);
  assert.equal(await redisClient.get(keys.attemptsKey), null);
  assert.equal(await redisClient.get(keys.verifiedKey), null);

  await cleanupEmail(email, ip);
});

test("correct OTP creates ten-minute verified key and removes OTP state", async () => {
  const email = "Redis.Otp.Verify@example.com";
  const ip = "10.20.30.41";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });

  const verifiedTtl = await redisClient.ttl(keys.verifiedKey);
  assert.equal(await redisClient.get(keys.otpKey), null);
  assert.equal(await redisClient.get(keys.attemptsKey), null);
  assert.equal(await redisClient.get(keys.verifiedKey), "verified");
  assert.ok(verifiedTtl > 0 && verifiedTtl <= 600);
  assert.ok(
    verifiedTtl >= 595,
    `expected verified TTL close to 600 seconds, got ${verifiedTtl}`
  );

  await cleanupEmail(email, ip);
});

test("incorrect OTP is rejected and five failures invalidate OTP", async () => {
  const email = "Redis.Otp.Attempts@example.com";
  const ip = "10.20.30.42";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const error = await expectReject(
      verifyOtpService({ email, otp: "000000" }),
      400
    );
    assert.equal(error.message, "Invalid OTP");
    assert.ok(await redisClient.get(keys.otpKey));
  }

  const finalError = await expectReject(
    verifyOtpService({ email, otp: "000000" }),
    400
  );
  assert.match(finalError.message, /Too many incorrect OTP attempts/);
  assert.equal(await redisClient.get(keys.otpKey), null);
  assert.equal(await redisClient.get(keys.attemptsKey), null);

  await cleanupEmail(email, ip);
});

test("resend invalidates old OTP and resets attempts", async () => {
  const email = "Redis.Otp.Resend@example.com";
  const ip = "10.20.30.43";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  const oldOtp = latestOtp();
  await expectReject(verifyOtpService({ email, otp: "000000" }), 400);
  assert.ok(await redisClient.get(keys.attemptsKey));

  await resendOtpService({ email, ip });
  const newOtp = latestOtp();

  assert.equal(await redisClient.get(keys.attemptsKey), null);
  await expectReject(verifyOtpService({ email, otp: oldOtp }), 400);
  await verifyOtpService({ email, otp: newOtp });
  assert.equal(await redisClient.get(keys.verifiedKey), "verified");

  await cleanupEmail(email, ip);
});

test("email and IP rate limits return 429 without resetting TTL", async () => {
  const email = "Redis.Otp.Rate@example.com";
  const ip = "10.20.30.44";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  for (let request = 1; request <= 3; request += 1) {
    await requestOtpService({ email, ip });
  }

  const ttlBeforeBlock = await redisClient.ttl(keys.emailRateKey);
  const emailError = await expectReject(
    requestOtpService({ email, ip }),
    429
  );
  const ttlAfterBlock = await redisClient.ttl(keys.emailRateKey);

  assert.match(emailError.message, /Too many OTP requests/);
  assert.ok(ttlAfterBlock <= ttlBeforeBlock);

  await cleanupEmail(email, ip);

  for (let request = 1; request <= 10; request += 1) {
    await requestOtpService({
      email: `redis.otp.ip.${request}@example.com`,
      ip,
    });
  }

  const ipLimitedEmail = "redis.otp.ip.blocked@example.com";
  const ipError = await expectReject(
    requestOtpService({ email: ipLimitedEmail, ip }),
    429
  );

  assert.match(ipError.message, /Too many OTP requests from this network/);

  for (let request = 1; request <= 10; request += 1) {
    await cleanupEmail(`redis.otp.ip.${request}@example.com`, ip);
  }
  await cleanupEmail(ipLimitedEmail, ip);
});

test("registration requires verified key, consumes it once, blocks admin, and sets instructor pending", async () => {
  const studentEmail = "Redis.Otp.Student@example.com";
  const instructorEmail = "Redis.Otp.Instructor@example.com";
  const ip = "10.20.30.45";
  const studentKeys = keysFor(studentEmail, ip);
  const instructorKeys = keysFor(instructorEmail, ip);
  await cleanupEmail(studentEmail, ip);
  await cleanupEmail(instructorEmail, ip);

  await expectReject(
    registerUser({
      name: "No Verify",
      email: studentEmail,
      password: "password123",
      role: "student",
    }),
    400
  );

  await expectReject(
    registerUser({
      name: "Public Admin",
      email: "redis.otp.admin@example.com",
      password: "password123",
      role: "admin",
    }),
    400
  );

  await requestOtpService({ email: studentEmail, ip });
  await verifyOtpService({ email: studentEmail, otp: latestOtp() });

  const student = await registerUser({
    name: "Student User",
    email: studentEmail,
    password: "password123",
    role: "student",
  });

  assert.equal(student.email, studentKeys.normalizedEmail);
  assert.equal(student.approvalStatus, "approved");
  assert.equal(await redisClient.get(studentKeys.verifiedKey), null);

  savedUsers.delete(studentKeys.normalizedEmail);

  const reuseError = await expectReject(
    registerUser({
      name: "Student User Reuse",
      email: studentEmail,
      password: "password123",
      role: "student",
    }),
    400
  );
  assert.match(reuseError.message, /verify OTP/i);

  await requestOtpService({ email: instructorEmail, ip });
  await verifyOtpService({ email: instructorEmail, otp: latestOtp() });

  const instructor = await registerUser({
    name: "Instructor User",
    email: instructorEmail,
    password: "password123",
    role: "instructor",
  });

  assert.equal(instructor.email, instructorKeys.normalizedEmail);
  assert.equal(instructor.approvalStatus, "pending");
  assert.equal(await redisClient.get(instructorKeys.verifiedKey), null);

  await cleanupEmail(studentEmail, ip);
  await cleanupEmail(instructorEmail, ip);
});

test("student registration sends no instructor registration notifications", async () => {
  const email = "Redis.Otp.StudentNoNotify@example.com";
  const ip = "10.20.30.47";
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });
  sentEmails.length = 0;
  attemptedEmails.length = 0;

  await registerUser({
    name: "Student No Notify",
    email,
    password: "student-password-123",
    role: "student",
  });

  assert.equal(attemptedEmails.length, 0);
  assert.equal(sentEmails.length, 0);

  await cleanupEmail(email, ip);
});

test("instructor registration attempts admin and instructor notification emails", async () => {
  const email = "instructor.notify@example.com";
  const ip = "10.20.30.48";
  const password = "instructor-password-123";
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });
  sentEmails.length = 0;
  attemptedEmails.length = 0;

  const user = await registerUser({
    name: "Instructor Notify",
    email,
    password,
    role: "instructor",
  });

  assert.equal(user.approvalStatus, "pending");
  assert.equal(attemptedEmails.length, 2);
  assert.equal(sentEmails.length, 2);

  const adminEmail = attemptedEmails.find((message) =>
    message.subject.includes("Awaiting Review")
  );
  const instructorEmail = attemptedEmails.find((message) =>
    message.subject.includes("Application Received")
  );

  assert.equal(adminEmail.to, process.env.ADMIN_NOTIFICATION_EMAIL);
  assert.equal(instructorEmail.to, user.email);

  for (const message of attemptedEmails) {
    const content = [
      message.subject,
      message.html,
      message.text,
    ].join("\n");

    assert.equal(content.includes(password), false);
    assert.equal(/password hash/i.test(content), false);
    assert.equal(/\botp\b/i.test(content), false);
    assert.equal(/\bjwt\b/i.test(content), false);
    assert.equal(/reset token/i.test(content), false);
    assert.equal(/google id/i.test(content), false);
  }

  await cleanupEmail(email, ip);
});

test("instructor remains registered when admin notification fails", async () => {
  const email = "Redis.Otp.AdminNotifyFail@example.com";
  const ip = "10.20.30.49";
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });
  sentEmails.length = 0;
  attemptedEmails.length = 0;
  failSubjects.add(
    "New Instructor Registration Awaiting Review — Learnify"
  );

  const user = await registerUser({
    name: "Admin Notify Fail",
    email,
    password: "password123",
    role: "instructor",
  });

  assert.equal(savedUsers.has(user.email), true);
  assert.equal(attemptedEmails.length, 2);
  assert.equal(sentEmails.length, 1);
  assert.ok(
    sentEmails.some((message) =>
      message.subject.includes("Application Received")
    )
  );

  await cleanupEmail(email, ip);
});

test("instructor remains registered when instructor confirmation fails", async () => {
  const email = "Redis.Otp.InstructorNotifyFail@example.com";
  const ip = "10.20.30.50";
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });
  sentEmails.length = 0;
  attemptedEmails.length = 0;
  failSubjects.add("Instructor Application Received — Learnify");

  const user = await registerUser({
    name: "Instructor Notify Fail",
    email,
    password: "password123",
    role: "instructor",
  });

  assert.equal(savedUsers.has(user.email), true);
  assert.equal(attemptedEmails.length, 2);
  assert.equal(sentEmails.length, 1);
  assert.ok(
    sentEmails.some((message) =>
      message.subject.includes("Awaiting Review")
    )
  );

  await cleanupEmail(email, ip);
});

test("no notification email is sent when MongoDB user save fails", async () => {
  const email = "Redis.Otp.SaveFail@example.com";
  const ip = "10.20.30.51";
  const originalSaveForTest = User.prototype.save;
  await cleanupEmail(email, ip);

  await requestOtpService({ email, ip });
  await verifyOtpService({ email, otp: latestOtp() });
  sentEmails.length = 0;
  attemptedEmails.length = 0;

  User.prototype.save = async () => {
    throw new Error("mock save failure");
  };

  await expectReject(
    registerUser({
      name: "Save Fail",
      email,
      password: "password123",
      role: "instructor",
    }),
    undefined
  );

  User.prototype.save = originalSaveForTest;
  assert.equal(attemptedEmails.length, 0);
  assert.equal(sentEmails.length, 0);

  await cleanupEmail(email, ip);
});

test("email delivery failure removes temporary OTP and attempt state", async () => {
  const email = "Redis.Otp.EmailFailure@example.com";
  const ip = "10.20.30.46";
  const keys = keysFor(email, ip);
  await cleanupEmail(email, ip);

  failNextEmail = true;
  await expectReject(requestOtpService({ email, ip }), 503);

  assert.equal(await redisClient.get(keys.otpKey), null);
  assert.equal(await redisClient.get(keys.attemptsKey), null);

  await cleanupEmail(email, ip);
});
