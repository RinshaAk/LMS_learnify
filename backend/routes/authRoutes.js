import express from "express";
import { asyncHandler } from "../middleware/trycatchmiddleware.js";

import { googleAuth, login, register } from "../controllers/authController.js";
import { otpController, otpverifyController, resendOtpController } from "../controllers/otpController.js";

const router = express.Router();

// test
router.get("/test", (req, res) => {
  res.send("API working");
});


// ================= AUTH =================
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/google", asyncHandler(googleAuth));

router.post("/resend-otp", resendOtpController);
router.post("/otp-sender", otpController);
router.post("/verify-otp", otpverifyController);

export default router;
