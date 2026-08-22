import {
  requestOtpService,
  resendOtpService,
  verifyOtpService,
} from "../services/authServices.js";
import { asyncHandler } from "../middleware/trycatchmiddleware.js";

export const otpController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const response = await requestOtpService({
    email,
    ip: req.ip,
  });

  res.status(200).json(response);
});

export const otpverifyController = asyncHandler(async (req, res) => {
  const { otp, email } = req.body;

  if (!otp || !email) {
    const error = new Error("OTP and email are required");
    error.statusCode = 400;
    throw error;
  }

  const verifyResponse = await verifyOtpService({
    otp: String(otp),
    email,
  });

  res.status(200).json(verifyResponse);
});

export const resendOtpController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const response = await resendOtpService({
    email,
    ip: req.ip,
  });

  res.status(200).json(response);
});
