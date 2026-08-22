import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  getCourseLessons,
  getCourseReviews,
  getLandingCourses,
  getPlatformStats,
  getTopTestimonials,
  submitCourseReview,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware.js";



const router = express.Router();

// create course
router.post("/", authMiddleware, roleMiddleware("instructor"), createCourse);

// get all courses
router.get("/", getCourses);
router.get("/landing-courses", getLandingCourses);
router.get("/platform-stats", getPlatformStats);
router.get("/testimonials", getTopTestimonials);

router.get("/:id/reviews", getCourseReviews);
router.post("/:id/reviews", authMiddleware, roleMiddleware("student"), submitCourseReview);
router.get("/:id/lessons", optionalAuthMiddleware, getCourseLessons);

// get single course
router.get("/:id", optionalAuthMiddleware, getCourseById);

// update course
router.put("/:id", authMiddleware, roleMiddleware("instructor"), updateCourse);

// delete course
router.delete("/:id", authMiddleware, roleMiddleware("instructor"), deleteCourse);

export default router;
