import express from "express";
import { 
  createExam, 
  getStudentExams, 
  updateExam, 
  getInstructorExams, 
  getExamAttempts, 
  gradeExamAttempt,
  deleteExam,
  updateExamStatuses,
  getSingleExam,
  publishExam,
  unpublishExam,
  duplicateExam,
  approveExamAttempt,
  getExamResourceUrl
} from "../controllers/examController.js";
import { 
  checkEligibility, 
  submitAttempt, 
  requestExtraAttempt, 
  getAttemptHistory 
} from "../controllers/attemptController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Exam management
router.post("/create", authMiddleware, roleMiddleware("instructor"), createExam);
router.post("/", authMiddleware, roleMiddleware("instructor"), createExam);
router.get("/student", authMiddleware, roleMiddleware("student"), getStudentExams);
router.get("/instructor", authMiddleware, roleMiddleware("instructor"), getInstructorExams);
router.post("/status/update", authMiddleware, updateExamStatuses);
router.get("/:id/resource-url", authMiddleware, roleMiddleware("student", "instructor"), getExamResourceUrl);
router.get("/:id", authMiddleware, getSingleExam);
router.put("/:id", authMiddleware, roleMiddleware("instructor"), updateExam);
router.delete("/:id", authMiddleware, roleMiddleware("instructor"), deleteExam);
router.patch("/:id/publish", authMiddleware, roleMiddleware("instructor"), publishExam);
router.patch("/:id/unpublish", authMiddleware, roleMiddleware("instructor"), unpublishExam);
router.post("/:id/duplicate", authMiddleware, roleMiddleware("instructor"), duplicateExam);

// Attempt management
router.get("/:examId/eligibility", authMiddleware, roleMiddleware("student"), checkEligibility);
router.post("/:examId/submit", authMiddleware, roleMiddleware("student"), submitAttempt);
router.post("/:examId/request", authMiddleware, roleMiddleware("student"), requestExtraAttempt);
router.get("/:examId/history", authMiddleware, roleMiddleware("student"), getAttemptHistory);
router.get("/:examId/submissions", authMiddleware, roleMiddleware("instructor"), getExamAttempts);
router.get("/:examId/attempts", authMiddleware, roleMiddleware("instructor"), getExamAttempts);
router.put("/attempts/:attemptId/grade", authMiddleware, roleMiddleware("instructor"), gradeExamAttempt);
router.patch("/attempts/:attemptId/approval", authMiddleware, roleMiddleware("instructor"), approveExamAttempt);

export default router;
