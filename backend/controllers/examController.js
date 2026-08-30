import { 
  createExamService, 
  getEnrolledStudentExamsService, 
  updateExamService,
  getInstructorExamsService,
  getExamAttemptsService,
  gradeExamAttemptService,
  deleteExamService,
  updateExamStatusesService,
  getSingleExamService,
  getExamResourceUrlService,
  publishExamService,
  unpublishExamService,
  duplicateExamService,
  approveExamAttemptService
} from "../services/examService.js";

// ✅ Create Exam
export const createExam = async (req, res, next) => {
  try {
    const exam = await createExamService({
      ...req.body,
      instructor: req.user.id,
    });
    res.status(201).json(exam);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Enrolled Student Exams
export const getStudentExams = async (req, res, next) => {
  try {
    const exams = await getEnrolledStudentExamsService(req.user.id);
    res.json(exams);
  } catch (error) {
    next(error);
  }
};

// Get Single Exam
export const getSingleExam = async (req, res, next) => {
  try {
    const exam = await getSingleExamService(req.params.id, req.user);
    res.json(exam);
  } catch (error) {
    next(error);
  }
};

export const getExamResourceUrl = async (req, res, next) => {
  try {
    const result = await getExamResourceUrlService(
      req.params.id,
      req.user,
      req.query.key
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ✅ Update Exam
export const updateExam = async (req, res, next) => {
  try {
    const exam = await updateExamService(req.params.id, req.user.id, req.body);
    res.json(exam);
  } catch (error) {
    next(error);
  }
};

// ✅ Delete Exam
export const deleteExam = async (req, res, next) => {
  try {
    const result = await deleteExamService(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Publish Exam
export const publishExam = async (req, res, next) => {
  try {
    const exam = await publishExamService(req.params.id, req.user.id);
    res.json(exam);
  } catch (error) {
    next(error);
  }
};

// Unpublish Exam
export const unpublishExam = async (req, res, next) => {
  try {
    const exam = await unpublishExamService(req.params.id, req.user.id);
    res.json(exam);
  } catch (error) {
    next(error);
  }
};

// Duplicate Exam
export const duplicateExam = async (req, res, next) => {
  try {
    const exam = await duplicateExamService(req.params.id, req.user.id);
    res.status(201).json(exam);
  } catch (error) {
    next(error);
  }
};

// ✅ Auto-update Exam Statuses
export const updateExamStatuses = async (req, res, next) => {
  try {
    await updateExamStatusesService();
    res.json({ message: "Exam statuses updated successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Get Instructor Exams
export const getInstructorExams = async (req, res, next) => {
  try {
    const exams = await getInstructorExamsService(req.user.id);
    res.json(exams);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Exam Attempts (Submissions)
export const getExamAttempts = async (req, res, next) => {
  try {
    const attempts = await getExamAttemptsService(req.params.examId);
    res.json(attempts);
  } catch (error) {
    next(error);
  }
};

// ✅ Grade Exam Attempt
export const gradeExamAttempt = async (req, res, next) => {
  try {
    const { score, feedback } = req.body;
    const attempt = await gradeExamAttemptService(
      req.params.attemptId,
      req.user.id,
      score,
      feedback
    );
    res.json(attempt);
  } catch (error) {
    next(error);
  }
};

// Approve or reject submission
export const approveExamAttempt = async (req, res, next) => {
  try {
    const { status, feedback } = req.body;
    const attempt = await approveExamAttemptService(
      req.params.attemptId,
      req.user.id,
      status,
      feedback
    );
    res.json(attempt);
  } catch (error) {
    next(error);
  }
};
