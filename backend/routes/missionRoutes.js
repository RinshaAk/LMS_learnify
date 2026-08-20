import express from "express";
import {
  createMission,
  getCourseMissions,
  submitMission,
  getMissionSubmissions,
  evaluateSubmission,
} from "../controllers/missionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Mission CRUD & listing
router.post("/", authMiddleware, roleMiddleware("instructor"), createMission);
router.get("/course/:courseId", authMiddleware, roleMiddleware("student", "instructor", "admin"), getCourseMissions);

// Submissions & evaluations
router.post("/:id/submit", authMiddleware, roleMiddleware("student"), submitMission);
router.get("/:id/submissions", authMiddleware, roleMiddleware("instructor", "admin"), getMissionSubmissions);
router.put("/submissions/:subId/evaluate", authMiddleware, roleMiddleware("instructor"), evaluateSubmission);

export default router;
