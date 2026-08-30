import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Review from "../models/Review.js";
import { LiveSession } from "../models/LiveSetion.js";
import Lesson from "../models/Lesson.js";
import Progress from "../models/Progress.js";
import Certificate from "../models/Certificate.js";
import ExamAttempt from "../models/ExamAttempt.js";
import StudentReview from "../models/StudentReview.js";
import crypto from "crypto";


// get profile

export const getUserProfileService = async (userId) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// update profile
export const updateUserProfileService = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// enroll
export const enrollCourseService = async ({ userId, courseId }) => {
  // check course exists
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // prevent duplicate enrollment
  const alreadyEnrolled = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });

  if (alreadyEnrolled) {
    const error = new Error("Already enrolled in this course");
    error.statusCode = 409;
    throw error;
  }

  const enrollment = await Enrollment.create({
    user: userId,
    course: courseId,
    instructor: course.instructor,
  });

  course.enrolledStudentsCount = (course.enrolledStudentsCount || 0) + 1;
  await course.save();

  // Auto-create pending certificate record for this enrollment
  try {
    const existingCert = await Certificate.findOne({ student: userId, course: courseId });
    if (!existingCert) {
      const certId = `LERN-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      await Certificate.create({
        student: userId,
        course: courseId,
        instructor: course.instructor,
        certificateId: certId,
        status: "pending",
        courseCompleted: false,
      });
    }
  } catch (certErr) {
    // Non-fatal: log but don't fail enrollment
    console.error("[Certificate] Auto-create failed:", certErr.message);
  }

  return enrollment;
};

// get enrolled courses
export const getEnrolledCoursesService = async (userId) => {

  const enrollments = await Enrollment.find({
    user: userId,
  }).populate({
    path: "course",
    populate: {
      path: "instructor",
      select: "name email profileImage verificationDetails",
    },
  });

  const activeEnrollments = enrollments.filter(e => e.course && !e.course.isBlocked);
  const courseIds = activeEnrollments.map((enrollment) => enrollment.course._id);
  const [certificates, progressRecords, lessonCounts] = await Promise.all([
    Certificate.find({ student: userId, course: { $in: courseIds } }),
    Progress.find({ student: userId, course: { $in: courseIds } }),
    Lesson.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]),
  ]);

  const certMap = new Map();
  certificates.forEach(c => {
    if (c.course) {
      certMap.set(c.course.toString(), {
        id: c._id,
        status: c.status,
        courseCompleted: c.courseCompleted,
      });
    }
  });

  const progressMap = new Map();
  progressRecords.forEach((progress) => {
    progressMap.set(progress.course.toString(), progress);
  });

  const lessonCountMap = new Map();
  lessonCounts.forEach((item) => {
    lessonCountMap.set(item._id.toString(), item.count);
  });

  return activeEnrollments.map((enrollment) => {

    const course = enrollment.course;
    const courseId = course._id.toString();
    const certificate = certMap.get(courseId) || null;
    const certificateApproved = ["approved", "issued"].includes(certificate?.status);
    const progress = progressMap.get(courseId);
    const completedLessons = progress?.completedLessons?.length || 0;
    const totalLessons = lessonCountMap.get(courseId) || 0;
    const progressPercentage = progress
      ? progress.progressPercentage
      : enrollment.progress || 0;
    const courseCompleted =
      enrollment.completed ||
      enrollment.completionStatus === "completed" ||
      progressPercentage >= 100 ||
      certificateApproved;

    return {

      ...enrollment.toObject(),

      completed: courseCompleted,

      progress: courseCompleted ? 100 : progressPercentage,

      completedLessons: courseCompleted && totalLessons > 0 ? totalLessons : completedLessons,

      nextLesson: enrollment.nextLesson || "Start Learning",

      certificateId: certificate?.id || null,

      certificateStatus: certificate?.status || null,

      completionStatus: courseCompleted ? "completed" : "in-progress",

      course: {
        ...course.toObject(),

        lessonsCount: totalLessons,
      },
    };
  });
};

export const getStudentExamResultsService = async (userId) => {
  const [taskAttempts, reviewSessions] = await Promise.all([
    ExamAttempt.find({
      student: userId,
      status: { $ne: "draft" },
      result: { $in: ["pass", "fail", "pending"] },
    })
      .populate({
        path: "exam",
        select: "title examType taskType type totalMarks",
      })
      .populate("course", "title")
      .sort({ updatedAt: -1 })
      .limit(20),
    StudentReview.find({
      $or: [{ student: userId }, { studentId: userId }],
      status: { $in: ["Pass", "Failed", "Completed", "Cancelled"] },
    })
      .populate("course", "title")
      .sort({ updatedAt: -1 })
      .limit(20),
  ]);

  const machineTaskResults = taskAttempts
    .filter((attempt) =>
      attempt.exam &&
      (
        attempt.exam.examType === "machine_task" ||
        attempt.exam.taskType === "task" ||
        attempt.exam.type === "mission_task"
      )
    )
    .map((attempt) => ({
      _id: attempt._id,
      kind: "machine_task",
      label: "Machine Task",
      title: attempt.exam?.title || "Machine Task",
      courseTitle: attempt.course?.title || "Course",
      status: attempt.status,
      result: attempt.result,
      score: attempt.score,
      totalMarks: attempt.exam?.totalMarks || 100,
      feedback: attempt.feedback || "",
      submittedAt: attempt.submittedAt || attempt.createdAt,
      updatedAt: attempt.updatedAt,
    }));

  const reviewResults = reviewSessions.map((session) => ({
    _id: session._id,
    kind: "review_exam",
    label: "Review Exam",
    title: session.course?.title || "Review Session",
    courseTitle: session.course?.title || "Course",
    status: session.status,
    result: session.status === "Pass"
      ? "pass"
      : session.status === "Failed"
        ? "fail"
        : session.status.toLowerCase(),
    score: session.mark,
    totalMarks: 100,
    feedback: session.notes || "",
    submittedAt: session.reviewDate || session.createdAt,
    updatedAt: session.updatedAt,
  }));

  return [...machineTaskResults, ...reviewResults]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 20);
};

// get instructors for a student
export const getInstructorsByStudentService = async (userId) => {
  const enrollments = await Enrollment.find({ user: userId }).populate({
    path: "course",
    populate: {
      path: "instructor",
      select: "name email profileImage",
    },
  });

  // Map to the requested format
  const instructors = enrollments
    .filter(enrollment => enrollment.course && enrollment.course.instructor)
    .map(enrollment => ({
      _id: enrollment.course.instructor._id,
      name: enrollment.course.instructor.name,
      email: enrollment.course.instructor.email,
      profileImage: enrollment.course.instructor.profileImage,
      course: {
        _id: enrollment.course._id,
        title: enrollment.course.title
      }
    }));

  return instructors;
};

// get my enrolled live sessions
export const getMyEnrolledLiveSessionsService = async (userId) => {
  const enrollments = await Enrollment.find({ user: userId });
  const courseIds = enrollments.map(e => e.course);
  
  return await LiveSession.find({ course: { $in: courseIds } })
    .populate("course", "title")
    .populate("instructor", "name profileImage");
};

// get my enrolled reviews
export const getMyEnrolledReviewsService = async (userId) => {
  const enrollments = await Enrollment.find({ user: userId });
  const courseIds = enrollments.map(e => e.course);
  
  return await Review.find({ course: { $in: courseIds } })
    .populate("course", "title")
    .populate("user", "name profileImage");
};



// ✅ Instructor Dashboard
export const getInstructorDashboardService = async (instructorId) => {

  // instructor courses
  const courses = await Course.find({
    instructor: instructorId,
  });

  const courseIds = courses.map(
    (course) => course._id
  );

  // all enrollments for instructor courses
  const enrollments = await Enrollment.find({
    course: { $in: courseIds },
  });

  // earnings
  let totalEarnings = 0;

  enrollments.forEach((enrollment) => {

    const course = courses.find(
      (c) =>
        c._id.toString() ===
        enrollment.course.toString()
    );

    if (course) {
      totalEarnings += course.price || 0;
    }
  });

  return {
    totalCourses: courses.length,

    totalStudents: enrollments.length,

    enrolledStudents: enrollments.length,

    totalEarnings,

    recentCourses: courses.slice(0, 5),
  };
};
