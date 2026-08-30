import { 
  enrollCourseService, 
  getEnrolledCoursesService, 
  getUserProfileService, 
  updateUserProfileService,
  getInstructorsByStudentService,
  getMyEnrolledLiveSessionsService,
  getMyEnrolledReviewsService,
  getStudentExamResultsService
} from "../services/userServices.js";
import StudentReview from "../models/StudentReview.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const [enrollments, examResults] = await Promise.all([
      getEnrolledCoursesService(req.user.id),
      getStudentExamResultsService(req.user.id),
    ]);
    const completedCourses = enrollments.filter(item => item.completed === true);
    const pendingCourses = enrollments.filter(item => item.completed !== true);

    res.status(200).json({
      success: true,
      studentName: req.user.name,
      completedCourses: completedCourses.length,
      pendingCourses: pendingCourses.length,
      enrolledCourses: enrollments,
      examResults,
      totalCourses: enrollments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Get Profile
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await getUserProfileService(req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// ✅ Update Profile
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await updateUserProfileService(req.user.id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// ✅ Enroll
export const enrollCourse = async (req, res, next) => {
  try {
    const enrollment = await enrollCourseService({
      userId: req.user.id,
      courseId: req.body.courseId,
    });
    res.status(201).json(enrollment);
  } catch (error) {
    next(error);
  }
};

// ✅ Enrolled courses
export const getEnrolledCourses = async (req, res, next) => {
  try {
    const enrollments = await getEnrolledCoursesService(req.user.id);
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Instructors for Student
export const getInstructorsByStudent = async (req, res, next) => {
  try {
    const instructors = await getInstructorsByStudentService(req.user.id);
    res.status(200).json(instructors);
  } catch (error) {
    next(error);
  }
};

// ✅ Get My Enrolled Live Sessions
export const getMyEnrolledLiveSessions = async (req, res, next) => {
  try {
    const sessions = await getMyEnrolledLiveSessionsService(req.user.id);
    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
};

// ✅ Get My Enrolled Reviews
export const getMyEnrolledReviews = async (req, res, next) => {
  try {
    const reviews = await getMyEnrolledReviewsService(req.user.id);
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// ✅ Get all review sessions scheduled for this student
export const getStudentScheduledReviews = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const sessions = await StudentReview.find({
      $or: [
        { student: studentId },
        { studentId: studentId }
      ]
    })
      .populate("instructor", "name email profileImage")
      .populate("instructorId", "name email profileImage")
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    const formatted = sessions.map(session => {
      const doc = session.toObject();
      return {
        _id: doc._id,
        course: doc.course,
        student: doc.student || doc.studentId,
        instructor: doc.instructor || doc.instructorId,
        date: doc.reviewDate || doc.scheduledDate || "",
        time: doc.reviewTime || "",
        meetingLink: doc.meetingLink || doc.roomId || "",
        status: doc.status || "Scheduled",
        attempt: doc.attempt || 1,
        mark: doc.mark || 0,
        notes: doc.notes || "",
      };
    });

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};
