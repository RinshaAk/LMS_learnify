import generateToken from "../utils/generateToken.js";
import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import { loginUser, registerUser } from "../services/authServices.js";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REGISTER
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const user = await registerUser({ name, email, password, role });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    token: generateToken(user._id),
    message: "User registered successfully",
  });
});

// LOGIN
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await loginUser({ email, password });

  if (user.isBlocked) {
    return res.status(403).json({
      message: user.blockedReason || "Your account has been blocked.",
      code: "ACCOUNT_BLOCKED",
    });
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    token: generateToken(user._id),
  });
});

const googleAuthFor = (portalRole) =>
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google account or email is not verified",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name?.trim() || email.split("@")[0];
    const picture = payload.picture || "";

    let user = await User.findOne({ email });

    if (user) {
      if (user.role !== portalRole) {
        return res.status(403).json({
          message: `This account is registered as ${user.role}. Please use the ${user.role} login page.`,
          code: "ROLE_MISMATCH",
          registeredRole: user.role,
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          message: user.blockedReason || "Your account has been blocked.",
          code: "ACCOUNT_BLOCKED",
        });
      }

      if (portalRole === "admin" && user.approvalStatus !== "approved") {
        return res.status(403).json({
          message: "Admin account is not approved",
          code: "ADMIN_NOT_APPROVED",
        });
      }

      if (user.googleId && user.googleId !== googleId) {
        return res.status(409).json({
          message: "This email is already linked to another Google account.",
          code: "GOOGLE_ACCOUNT_MISMATCH",
        });
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      const providers = Array.isArray(user.authProviders)
        ? [...user.authProviders]
        : [];

      if (user.password && !providers.includes("password")) {
        providers.push("password");
      }

      if (!providers.includes("google")) {
        providers.push("google");
      }

      user.authProviders = providers;

      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }

      await user.save();
    } else {
      if (portalRole === "instructor") {
        return res.status(403).json({
          message:
            "No instructor account was found with this Google email. Please complete instructor registration first.",
          code: "INSTRUCTOR_ACCOUNT_NOT_FOUND",
        });
      }

      if (portalRole === "admin") {
        return res.status(403).json({
          message: "This Google account is not registered as an admin.",
          code: "ADMIN_ACCOUNT_NOT_FOUND",
        });
      }

      const fallbackPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString("hex"),
        12
      );

      user = await User.create({
        name,
        email,
        password: fallbackPassword,
        role: "student",
        googleId,
        authProviders: ["google"],
        isVerified: true,
        profileImage: picture,
        approvalStatus: "approved",
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      token: generateToken(user._id),
    });
  });

export const googleStudentAuth = googleAuthFor("student");
export const googleInstructorAuth = googleAuthFor("instructor");
export const googleAdminAuth = googleAuthFor("admin");
