import generateToken from "../utils/generateToken.js";
import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import {
  loginUserForRole,
  registerUser,
} from "../services/authServices.js";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "../utils/sendEmail.js";
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
  return res.status(410).json({
    message: "Please use the correct portal login page.",
    code: "PORTAL_LOGIN_REQUIRED",
  });
});

export const loginFor = (portalRole) =>
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await loginUserForRole({
        email,
        password,
        portalRole,
      });

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        token: generateToken(user._id),
      });
    } catch (error) {
      if (error.code === "ROLE_MISMATCH") {
        return res.status(403).json({
          message: error.message,
          code: "ROLE_MISMATCH",
          registeredRole: error.registeredRole,
        });
      }

      if (error.code === "ACCOUNT_BLOCKED") {
        return res.status(403).json({
          message: error.message,
          code: "ACCOUNT_BLOCKED",
        });
      }

      throw error;
    }
  });

export const studentLogin = loginFor("student");
export const instructorLogin = loginFor("instructor");
export const adminLogin = loginFor("admin");

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

  // FORGOT PASSWORD
export const forgotPassword = asyncHandler(
  async (req, res) => {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const allowedPortals = ["student", "instructor", "admin"];
    const portal = allowedPortals.includes(req.body.portal)
      ? req.body.portal
      : "student";

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    /*
     * Use the same response even when the email does
     * not exist. This prevents email enumeration.
     */
    const responseMessage =
      "If an account exists with this email, a password reset link has been sent.";

    if (!user) {
      return res.status(200).json({
        message: responseMessage,
      });
    }

    if (user.isBlocked) {
      return res.status(200).json({
        message: responseMessage,
      });
    }

    // This original token is sent through email.
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Only the hashed token is stored in MongoDB.
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;

    // Reset link expires after 15 minutes.
    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const frontendUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${frontendUrl}/reset-password/${resetToken}?portal=${portal}`;

    const emailHtml = `
      <div
        style="
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          font-family: Arial, sans-serif;
          color: #1e293b;
        "
      >
        <h2 style="color: #4f46e5;">
          Reset your Learnify password
        </h2>

        <p>Hello,</p>

        <p>
          We received a request to reset the password
          for your Learnify account.
        </p>

        <p>
          Click the button below to create a new password.
          This link will expire in 15 minutes.
        </p>

        <div style="margin: 30px 0;">
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 22px;
              background-color: #4f46e5;
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>
        </div>

        <p>
          If you did not request a password reset,
          you can safely ignore this email.
        </p>

        <p>
          Best regards,<br />
          The Learnify Team
        </p>
      </div>
    `;

    try {
      await sendEmail(
        user.email,
        "Reset your Learnify password",
        emailHtml
      );
    } catch (error) {
      /*
       * Remove the token when email delivery fails,
       * because the user cannot use it.
       */
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await user.save();

      throw error;
    }

    return res.status(200).json({
      message: responseMessage,
    });
  }
);

// RESET PASSWORD
export const resetPassword = asyncHandler(
  async (req, res) => {
    const { token } = req.params;

    const {
      password,
      confirmPassword,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Reset token is required",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message:
          "Password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters",
      });
    }

    /*
     * Hash the token received in the URL so it can
     * be compared with the hash stored in MongoDB.
     */
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,

      resetPasswordExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "The password reset link is invalid or has expired.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message:
          user.blockedReason ||
          "Your account has been blocked.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    /*
     * Your User model does not hash passwords
     * automatically, so hash it here.
     */
    user.password = await bcrypt.hash(
      password,
      12
    );

    // The reset token can be used only once.
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    /*
     * A Google-only user can now also log in
     * using the new password.
     */
    const providers = Array.isArray(
      user.authProviders
    )
      ? [...user.authProviders]
      : [];

    if (!providers.includes("password")) {
      providers.push("password");
    }

    user.authProviders = providers;

    await user.save();

    return res.status(200).json({
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  }
);

export const googleStudentAuth = googleAuthFor("student");
export const googleInstructorAuth = googleAuthFor("instructor");
export const googleAdminAuth = googleAuthFor("admin");
