import express from "express";

import { asyncHandler } from "../middleware/trycatchmiddleware.js";

// ================= CONTROLLERS =================

import {
  googleAdminAuth,
  googleInstructorAuth,
  googleStudentAuth,
  login,
  register,
} from "../controllers/authController.js";

import {
  deleteCourseAdmin,
  deleteUser,
  getAllCoursesAdmin,
  getAllUsers,
} from "../controllers/adminController.js";

import {
  getMessages,
  markAsRead,
  sendMessage,
} from "../controllers/chatController.js";

import {
  createCourse,
  deleteCourse,
  getCourseById,
  getCourses,
  updateCourse,
} from "../controllers/courseController.js";

import {
  getInstructorCourses,
  publishCourse,
} from "../controllers/instructorController.js";

import {
  createLiveSession,
  endLiveSession,
  getLiveSessions,
  startLiveSession,
} from "../controllers/liveController.js";

import {
  enrollCourse,
  getEnrolledCourses,
  getUserProfile,
} from "../controllers/userController.js";

import {
  otpController,
  otpverifyController,
  resendOtpController,
} from "../controllers/otpController.js";

const router = express.Router();

// ================= TEST =================

router.get("/test", (req, res) => {
  res.status(200).send("API working");
});

// ================= AUTH =================

// These controllers already use asyncHandler internally.
router.post("/register", register);
router.post("/login", login);

router.post(
  "/google/student",
  googleStudentAuth
);

router.post(
  "/google/instructor",
  googleInstructorAuth
);

router.post(
  "/google/admin",
  googleAdminAuth
);

// ================= OTP =================

router.post(
  "/otp-sender",
  asyncHandler(otpController)
);

router.post(
  "/verify-otp",
  asyncHandler(otpverifyController)
);

router.post(
  "/resend-otp",
  asyncHandler(resendOtpController)
);

// ================= ADMIN =================

router.get(
  "/admin/users",
  asyncHandler(getAllUsers)
);

router.delete(
  "/admin/users/:id",
  asyncHandler(deleteUser)
);

router.get(
  "/admin/courses",
  asyncHandler(getAllCoursesAdmin)
);

router.delete(
  "/admin/courses/:id",
  asyncHandler(deleteCourseAdmin)
);

// ================= CHAT =================

router.post(
  "/chat",
  asyncHandler(sendMessage)
);

router.get(
  "/chat/:userId",
  asyncHandler(getMessages)
);

router.put(
  "/chat/read/:userId",
  asyncHandler(markAsRead)
);

// ================= COURSES =================

router.post(
  "/courses",
  asyncHandler(createCourse)
);

router.get(
  "/courses",
  asyncHandler(getCourses)
);

router.get(
  "/courses/:id",
  asyncHandler(getCourseById)
);

router.put(
  "/courses/:id",
  asyncHandler(updateCourse)
);

router.delete(
  "/courses/:id",
  asyncHandler(deleteCourse)
);

// ================= INSTRUCTOR =================

router.get(
  "/instructor/courses",
  asyncHandler(getInstructorCourses)
);

router.put(
  "/instructor/courses/:id/publish",
  asyncHandler(publishCourse)
);

// ================= LIVE =================

router.post(
  "/live",
  asyncHandler(createLiveSession)
);

router.get(
  "/live/:courseId",
  asyncHandler(getLiveSessions)
);

router.put(
  "/live/start/:id",
  asyncHandler(startLiveSession)
);

router.put(
  "/live/end/:id",
  asyncHandler(endLiveSession)
);

// ================= USER =================

router.get(
  "/user/profile",
  asyncHandler(getUserProfile)
);

router.post(
  "/user/enroll",
  asyncHandler(enrollCourse)
);

router.get(
  "/user/enrollments",
  asyncHandler(getEnrolledCourses)
);

export default router;