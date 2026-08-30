import ExamAttempt from "../models/ExamAttempt.js";
import Exam from "../models/Exam.js";
import AttemptRequest from "../models/AttemptRequest.js";
import Enrollment from "../models/Enrollment.js";
import { checkAndCreatePendingCertificate } from "./certificateService.js";

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getExamStart = (exam) => exam.scheduledAt || exam.scheduledDate;

const getExamEnd = (exam) => {
  if (exam.taskType === "task" || exam.type === "mission_task") {
    return exam.deadline || null;
  }

  const start = getExamStart(exam);
  if (start && Number(exam.duration || 0) > 0) {
    return new Date(new Date(start).getTime() + Number(exam.duration) * 60 * 1000);
  }
  return exam.deadline || null;
};

const assertExamWindowOpen = (exam) => {
  if (exam.isDraft) throw createHttpError("Exam is not published", 403);

  const now = new Date();
  const start = getExamStart(exam);
  const end = getExamEnd(exam);

  if (start && now < new Date(start)) throw createHttpError("This exam has not started yet", 403);
  if (end && now > new Date(end)) throw createHttpError("This exam is closed", 403);
  if (!start && !end && ["completed", "expired"].includes(exam.status)) {
    throw createHttpError("This exam is closed", 403);
  }
};

const hasStudentAssignmentRestriction = (exam) => Array.isArray(exam.assignedStudents) && exam.assignedStudents.length > 0;

const isStudentAssignedToExam = (exam, userId) => {
  if (!hasStudentAssignmentRestriction(exam)) return true;
  return exam.assignedStudents.some((studentId) => studentId.toString() === userId);
};

// Check Eligibility
export const checkAttemptEligibilityService = async (userId, examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);

  // Check enrollment
  const enrollment = await Enrollment.findOne({ user: userId, course: exam.course });
  const directlyAssigned = exam.assignedStudents?.some((studentId) => studentId.toString() === userId);
  if (!enrollment && !directlyAssigned) throw createHttpError("You are not assigned to this exam", 403);
  if (enrollment && !isStudentAssignedToExam(exam, userId)) throw createHttpError("You are not assigned to this exam", 403);

  if (exam.isDraft) throw createHttpError("Exam is not published", 403);

  // Check if course is completed (optional business rule)
  // if (!enrollment.completed) throw new Error("You must complete the course before taking the exam");

  const attemptCount = await ExamAttempt.countDocuments({
    student: userId,
    exam: examId,
    status: { $ne: "draft" },
  });

  // Check if student has remaining attempts
  if (attemptCount < exam.maxAttempts) {
    return { eligible: true, attemptsUsed: attemptCount, maxAttempts: exam.maxAttempts };
  }

  // If no attempts left, check if there's an approved and paid request
  const approvedRequest = await AttemptRequest.findOne({
    student: userId,
    exam: examId,
    status: "approved",
    paymentStatus: { $in: ["paid", "not_applicable"] }
  });

  if (approvedRequest) {
    return { eligible: true, attemptsUsed: attemptCount, maxAttempts: exam.maxAttempts + 1, isExtra: true };
  }

  return { eligible: false, attemptsUsed: attemptCount, maxAttempts: exam.maxAttempts };
};

// Submit Attempt
export const submitAttemptService = async (userId, examId, attemptData) => {
  const eligibility = await checkAttemptEligibilityService(userId, examId);
  if (!eligibility.eligible) throw createHttpError("You are not eligible for another attempt", 403);

  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  assertExamWindowOpen(exam);

  const {
    score,
    answers = [],
    uploadedFiles = [],
    submissionUrl,
    studentNotes,
    status = "submitted",
  } = attemptData;

  const alreadySubmitted = await ExamAttempt.findOne({
    student: userId,
    exam: examId,
    status: { $in: ["submitted", "approved", "evaluated"] },
  });
  if (alreadySubmitted && exam.maxAttempts <= 1) {
    throw createHttpError("You have already submitted this exam", 409);
  }

  let result = "pending";
  let finalScore = Number(score || 0);
  const normalizedAnswers = Array.isArray(answers) ? answers : [];

  const isPendingGrading = exam.examType === "machine_task" || exam.taskType === "task" || exam.type === "mission_task";

  if (!isPendingGrading) {
    if (normalizedAnswers.length > 0 && exam.questions?.length > 0) {
      let earned = 0;
      let possible = 0;

      normalizedAnswers.forEach((answer) => {
        const question = exam.questions[answer.questionIndex];
        if (!question) return;
        const marks = Number(question.marks || 1);
        possible += marks;
        const isCorrect = Number(answer.selectedOption) === Number(question.correct);
        answer.isCorrect = isCorrect;
        answer.marksAwarded = isCorrect ? marks : 0;
        if (isCorrect) earned += marks;
      });

      finalScore = possible > 0
        ? Math.round((earned / possible) * Number(exam.totalMarks || 100))
        : 0;
    }

    result = finalScore >= exam.passingMarks ? "pass" : "fail";
  }

  const attempt = await ExamAttempt.create({
    student: userId,
    exam: examId,
    course: exam.course,
    attemptNumber: eligibility.attemptsUsed + 1,
    score: isPendingGrading ? 0 : finalScore,
    obtainedMarks: isPendingGrading ? 0 : finalScore,
    result,
    status,
    answers: normalizedAnswers,
    uploadedFiles,
    submissionUrl: isPendingGrading ? submissionUrl : undefined,
    studentNotes,
    submittedAt: status === "draft" ? undefined : new Date(),
  });

  if (result === "pass") {
    try {
      await checkAndCreatePendingCertificate(userId, exam.course);
    } catch (certErr) {
      console.error("[Certificate] Auto-check after exam pass failed:", certErr.message);
    }
  }

  // If this was an extra attempt from a request, mark the request as used (or handled)
  if (eligibility.isExtra) {
    await AttemptRequest.findOneAndUpdate(
      { student: userId, exam: examId, status: "approved" },
      { status: "completed" } // Custom status to mark used
    );
  }

  return attempt;
};

// Request Extra Attempt
export const createAttemptRequestService = async (userId, examId, reason) => {
  const existingRequest = await AttemptRequest.findOne({ student: userId, exam: examId, status: "pending" });
  if (existingRequest) throw createHttpError("You already have a pending request", 409);

  return await AttemptRequest.create({
    student: userId,
    exam: examId,
    requestReason: reason
  });
};

// Get Attempt History
export const getAttemptHistoryService = async (userId, examId) => {
  return await ExamAttempt.find({ student: userId, exam: examId }).sort({ attemptNumber: 1 });
};
