import Exam from "../models/Exam.js";
import Enrollment from "../models/Enrollment.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Course from "../models/Course.js";
import { checkAndCreatePendingCertificate } from "./certificateService.js";
import { createPresignedPdfUrl, deletePdfFromS3 } from "../utils/s3Uploads.js";

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
  const duration = Number(exam.duration || 0);
  if (start && duration > 0) {
    return new Date(new Date(start).getTime() + duration * 60 * 1000);
  }
  return exam.deadline || null;
};

const isExternalUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const isS3PdfKey = (value) => String(value || "").startsWith("pdfs/");
const getExamPdfReferences = (exam) => {
  const values = [
    exam.attachment,
    ...(Array.isArray(exam.attachments) ? exam.attachments : []),
  ].filter(Boolean);

  return [...new Set(values)];
};

const hasStudentAssignmentRestriction = (exam) => Array.isArray(exam.assignedStudents) && exam.assignedStudents.length > 0;

const isStudentAssignedToExam = (exam, userId) => {
  if (!hasStudentAssignmentRestriction(exam)) return true;
  return exam.assignedStudents.some((studentId) => studentId.toString() === userId);
};

const deleteS3PdfReferences = async (references) => {
  const keys = [...new Set((references || []).filter(isS3PdfKey))];

  for (const key of keys) {
    await deletePdfFromS3(key);
  }
};

const normalizeStatus = (exam, now = new Date()) => {
  if (exam.isDraft) return "draft";

  const start = getExamStart(exam);
  const end = getExamEnd(exam);

  if (start && now < new Date(start)) return "scheduled";
  if (end && now > new Date(end)) return "completed";
  if (start && now >= new Date(start)) return "ongoing";
  if (!start && end && now <= new Date(end)) return "ongoing";

  return exam.status || "scheduled";
};

const validateExamPayload = async (examData, instructorId, isUpdate = false) => {
  if (examData.courseId && !examData.course) examData.course = examData.courseId;
  if (examData.instructorId && !examData.instructor) examData.instructor = examData.instructorId;
  if (examData.type && !examData.taskType) {
    examData.taskType = examData.type === "mission_task" ? "task" : "exam";
  }
  if (examData.type === "coding") examData.examType = "machine_task";
  if (examData.type === "theory") examData.examType = "theory";
  if (Array.isArray(examData.questions)) {
    examData.questions = examData.questions.map((question) => {
      const normalized = { ...question };
      if (normalized.question && !normalized.q) normalized.q = normalized.question;
      if (normalized.q && !normalized.question) normalized.question = normalized.q;
      if (normalized.correctAnswer !== undefined && normalized.correct === undefined && normalized.type === "mcq") {
        normalized.correct = Number(normalized.correctAnswer);
      }
      if (normalized.correct !== undefined && normalized.correctAnswer === undefined) {
        normalized.correctAnswer = normalized.correct;
      }
      return normalized;
    });
  }

  const title = examData.title?.trim();
  if (!isUpdate || title !== undefined) {
    if (!title) throw createHttpError("Exam title is required");
    examData.title = title;
  }

  if (examData.course) {
    const course = await Course.findOne({ _id: examData.course, instructor: instructorId });
    if (!course) throw createHttpError("Course not found or not owned by instructor", 403);
  }

  const totalMarks = Number(examData.totalMarks ?? 0);
  const passingMarks = Number(examData.passingMarks ?? 0);
  if (examData.totalMarks !== undefined && (!Number.isFinite(totalMarks) || totalMarks <= 0)) {
    throw createHttpError("Total marks must be greater than 0");
  }
  if (examData.passingMarks !== undefined && (!Number.isFinite(passingMarks) || passingMarks < 0)) {
    throw createHttpError("Passing marks must be a valid number");
  }
  if (examData.totalMarks !== undefined && examData.passingMarks !== undefined && passingMarks > totalMarks) {
    throw createHttpError("Passing marks cannot be greater than total marks");
  }

  if (examData.scheduledAt && !examData.scheduledDate) examData.scheduledDate = examData.scheduledAt;
  if (examData.scheduledDate && !examData.scheduledAt) examData.scheduledAt = examData.scheduledDate;

  const now = new Date();
  const scheduled = examData.scheduledDate ? new Date(examData.scheduledDate) : null;
  const deadline = examData.deadline ? new Date(examData.deadline) : null;

  if (scheduled && Number.isNaN(scheduled.getTime())) throw createHttpError("Invalid scheduled date");
  if (deadline && Number.isNaN(deadline.getTime())) throw createHttpError("Invalid deadline");

  const taskType = examData.taskType || "exam";
  if (taskType === "exam" && !isUpdate && !scheduled && !examData.isDraft) {
    throw createHttpError("Scheduled date and time are required");
  }
  if (deadline && scheduled && deadline <= scheduled) {
    throw createHttpError("Deadline must be after the scheduled start time");
  }

  const examType = examData.examType || "theory";
  const questions = Array.isArray(examData.questions) ? examData.questions : [];
  if (!isUpdate && questions.length === 0 && examType !== "machine_task") {
    throw createHttpError("At least one question is required");
  }

  if (questions.length > 0) {
    questions.forEach((question, index) => {
      if (!question.q?.trim()) throw createHttpError(`Question ${index + 1} is missing text`);
      const options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
      if ((question.type || "mcq") === "mcq") {
        if (options.length < 2) throw createHttpError(`Question ${index + 1} needs at least two options`);
        if (!Number.isInteger(Number(question.correct)) || Number(question.correct) < 0 || Number(question.correct) >= options.length) {
          throw createHttpError(`Question ${index + 1} has an invalid correct answer`);
        }
      }
      if (!Number.isFinite(Number(question.marks || 0)) || Number(question.marks || 0) <= 0) {
        throw createHttpError(`Question ${index + 1} marks must be greater than 0`);
      }
    });
  }

  if (examData.isDraft) {
    examData.status = "draft";
  } else {
    examData.status = scheduled ? "scheduled" : "ongoing";
  }
};

// Auto-update Exam/Task statuses based on current time
export const updateExamStatusesService = async () => {
  const now = new Date();
  const exams = await Exam.find({});
  
  for (const exam of exams) {
    const newStatus = normalizeStatus(exam, now);
    
    if (exam.status !== newStatus) {
      exam.status = newStatus;
      await exam.save();
    }
  }
};

// Create Exam
export const createExamService = async (examData) => {
  await validateExamPayload(examData, examData.instructor);
  return await Exam.create(examData);
};

// Get Exams for Student (Enrolled courses only)
export const getEnrolledStudentExamsService = async (userId) => {
  // Update statuses first
  await updateExamStatusesService();

  // Find courses student is enrolled in
  const enrollments = await Enrollment.find({ user: userId });
  const courseIds = enrollments.map(e => e.course);

  // Find exams for these courses (excluding drafts)
  const exams = await Exam.find({
    isDraft: { $ne: true },
    $or: [
      { assignedStudents: userId },
      {
        course: { $in: courseIds },
        $or: [
          { assignedStudents: { $exists: false } },
          { assignedStudents: { $size: 0 } },
        ],
      },
    ],
  })
    .populate("course", "title")
    .populate("instructor", "name profileImage");

  // For each exam, get the student's attempt count
  const examsWithAttempts = await Promise.all(exams.map(async (exam) => {
    const attemptCount = await ExamAttempt.countDocuments({ student: userId, exam: exam._id });
    const latestAttempt = await ExamAttempt.findOne({ student: userId, exam: exam._id }).sort({ createdAt: -1 });
    
    return {
      ...exam.toObject(),
      attemptCount,
      latestResult: latestAttempt ? latestAttempt.result : null,
      latestScore: latestAttempt ? latestAttempt.score : null,
      latestFeedback: latestAttempt ? latestAttempt.feedback : null,
      latestStatus: latestAttempt ? latestAttempt.status : null,
      submittedAt: latestAttempt ? latestAttempt.submittedAt : null,
    };
  }));

  return examsWithAttempts;
};

// Update Exam
export const updateExamService = async (examId, instructorId, updates) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  if (exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);

  const previousPdfReferences = getExamPdfReferences(exam);
  const validationPayload = updates.isDraft === false
    ? { ...exam.toObject(), ...updates }
    : updates;
  await validateExamPayload(validationPayload, instructorId, updates.isDraft !== false);
  Object.assign(exam, updates);
  const nextPdfReferences = getExamPdfReferences(exam);
  const removedPdfReferences = previousPdfReferences.filter((item) => !nextPdfReferences.includes(item));

  await deleteS3PdfReferences(removedPdfReferences);
  return await exam.save();
};

// Delete Exam
export const deleteExamService = async (examId, instructorId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  if (exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);

  await deleteS3PdfReferences(getExamPdfReferences(exam));
  await Exam.findByIdAndDelete(examId);
  await ExamAttempt.deleteMany({ exam: examId });
  return { message: "Exam and associated attempts deleted successfully" };
};

// Get Instructor Exams
export const getInstructorExamsService = async (instructorId) => {
  // Update statuses first
  await updateExamStatusesService();

  const exams = await Exam.find({ instructor: instructorId })
    .populate("course", "title")
    .sort({ createdAt: -1 });

  return await Promise.all(exams.map(async (exam) => {
    const [totalSubmissions, pendingGrading] = await Promise.all([
      ExamAttempt.countDocuments({ exam: exam._id, status: { $ne: "draft" } }),
      ExamAttempt.countDocuments({ exam: exam._id, result: "pending", status: { $ne: "draft" } }),
    ]);

    return {
      ...exam.toObject(),
      totalSubmissions,
      pendingGrading,
    };
  }));
};

export const getSingleExamService = async (examId, user) => {
  await updateExamStatusesService();
  const exam = await Exam.findById(examId)
    .populate("course", "title")
    .populate("instructor", "name profileImage");
  if (!exam) throw createHttpError("Exam not found", 404);

  if (user.role === "instructor" && exam.instructor._id.toString() !== user.id) {
    throw createHttpError("Not authorized", 403);
  }

  if (user.role === "student") {
    const enrollment = await Enrollment.findOne({ user: user.id, course: exam.course._id });
    const directlyAssigned = exam.assignedStudents?.some((studentId) => studentId.toString() === user.id);
    if (!enrollment && !directlyAssigned) throw createHttpError("Not authorized", 403);
    if (enrollment && !isStudentAssignedToExam(exam, user.id)) throw createHttpError("Not authorized", 403);
    if (exam.isDraft) throw createHttpError("Exam is not published", 403);
  }

  return exam;
};

export const getExamResourceUrlService = async (examId, user, resourceKey) => {
  await updateExamStatusesService();
  const exam = await Exam.findById(examId).populate("course", "title");
  if (!exam) throw createHttpError("Exam not found", 404);

  if (user.role === "instructor" && exam.instructor.toString() !== user.id) {
    throw createHttpError("Not authorized", 403);
  }

  if (user.role === "student") {
    const enrollment = await Enrollment.findOne({ user: user.id, course: exam.course._id });
    const directlyAssigned = exam.assignedStudents?.some((studentId) => studentId.toString() === user.id);
    if (!enrollment && !directlyAssigned) throw createHttpError("Not authorized", 403);
    if (enrollment && !isStudentAssignedToExam(exam, user.id)) throw createHttpError("Not authorized", 403);
    if (exam.isDraft) throw createHttpError("Exam is not published", 403);
  }

  const references = getExamPdfReferences(exam);
  const selectedResource = resourceKey || exam.attachment || references[0];

  if (!selectedResource) {
    throw createHttpError("No PDF resource found", 404);
  }

  if (!references.includes(selectedResource)) {
    throw createHttpError("PDF resource does not belong to this assessment", 403);
  }

  if (isExternalUrl(selectedResource)) {
    return { url: selectedResource, expiresIn: null, storage: "legacy" };
  }

  if (!isS3PdfKey(selectedResource)) {
    throw createHttpError("Invalid PDF reference", 400);
  }

  const signed = await createPresignedPdfUrl(selectedResource);
  return { ...signed, storage: "s3" };
};

export const publishExamService = async (examId, instructorId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  if (exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);

  const payload = exam.toObject();
  payload.isDraft = false;
  await validateExamPayload(payload, instructorId, true);

  exam.isDraft = false;
  exam.status = normalizeStatus({ ...exam.toObject(), isDraft: false });
  return await exam.save();
};

export const unpublishExamService = async (examId, instructorId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  if (exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);

  exam.isDraft = true;
  exam.status = "draft";
  return await exam.save();
};

export const duplicateExamService = async (examId, instructorId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw createHttpError("Exam not found", 404);
  if (exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);

  const copy = exam.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  copy.title = `${exam.title} Copy`;
  copy.isDraft = true;
  copy.status = "draft";

  return await Exam.create(copy);
};

// Get Exam Attempts for Grading
export const getExamAttemptsService = async (examId) => {
  return await ExamAttempt.find({ exam: examId })
    .populate("student", "name email profileImage")
    .sort({ attemptNumber: -1 });
};

// Grade student exam attempt
export const gradeExamAttemptService = async (attemptId, instructorId, score, feedback) => {
  const attempt = await ExamAttempt.findById(attemptId).populate("exam");
  if (!attempt) throw createHttpError("Attempt not found", 404);
  if (attempt.exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized to grade this attempt", 403);

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > attempt.exam.totalMarks) {
    throw createHttpError(`Score must be between 0 and ${attempt.exam.totalMarks}`);
  }

  attempt.score = numericScore;
  attempt.obtainedMarks = numericScore;
  attempt.feedback = feedback;
  if (attempt.status !== "approved" && attempt.status !== "rejected") {
    attempt.status = "evaluated";
  }
  const resultVal = numericScore >= attempt.exam.passingMarks ? "pass" : "fail";
  attempt.result = resultVal;

  const savedAttempt = await attempt.save();

  const requiresManualApproval = attempt.exam.examType === "machine_task" || attempt.exam.taskType === "task";
  if (resultVal === "pass" && (!requiresManualApproval || attempt.status === "approved")) {
    try {
      await checkAndCreatePendingCertificate(attempt.student, attempt.exam.course);
    } catch (certErr) {
      console.error("[Certificate] Check after manual grading failed:", certErr.message);
    }
  }

  return savedAttempt;
};

export const approveExamAttemptService = async (attemptId, instructorId, status, feedback) => {
  const attempt = await ExamAttempt.findById(attemptId).populate("exam");
  if (!attempt) throw createHttpError("Attempt not found", 404);
  if (attempt.exam.instructor.toString() !== instructorId) throw createHttpError("Not authorized", 403);
  if (!["approved", "rejected"].includes(status)) throw createHttpError("Invalid approval status");

  attempt.status = status;
  if (feedback !== undefined) attempt.feedback = feedback;
  if (status === "rejected") {
    attempt.result = "fail";
  } else if (status === "approved" && attempt.result === "pending") {
    attempt.result = "pass";
  }

  const savedAttempt = await attempt.save();

  if (status === "approved" && attempt.result === "pass") {
    try {
      await checkAndCreatePendingCertificate(attempt.student, attempt.exam.course);
    } catch (certErr) {
      console.error("[Certificate] Check after attempt approval failed:", certErr.message);
    }
  }

  return savedAttempt;
};
