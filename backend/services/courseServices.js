import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { LiveSession } from "../models/LiveSetion.js";

const formatGrowth = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
};

const getMonthRanges = () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    currentMonth: { $gte: currentMonthStart, $lte: now },
    previousMonth: { $gte: previousMonthStart, $lt: currentMonthStart },
  };
};


// ================= CREATE COURSE =================
export const createCourseService = async ({
  title,
  description,
  price,
  category,
  instructor,
  thumbnail,
  language,
  level,
}) => {
  const course = await Course.create({
    title,
    description,
    price,
    category,
    instructor,
    thumbnail,
    language,
    level,
    approvalStatus: "pending",
  });

  return course;
};

// ================= GET ALL COURSES =================
export const getCoursesService = async (filters = {}) => {
  const {
    limit,
    skip,
    landing,
    ...queryFilters
  } = filters;

  const query = {
    ...queryFilters,
    isHidden: { $ne: true },
    isBlocked: { $ne: true },
  };

  if (landing !== "true") {
    query.status = "published";
    query.approvalStatus = "approved";
  }

  const courses = await Course.find(query)
    .populate("instructor", "name email profileImage verificationDetails studentsCount")
    .sort({
      approvalStatus: 1,
      status: -1,
      createdAt: -1,
    })
    .limit(limit ? parseInt(limit) : 0)
    .skip(skip ? parseInt(skip) : 0);

  return courses;
};

// ================= PUBLIC LANDING COURSES =================
export const getLandingCoursesService = async (limit = 3) => {
  const parsedLimit = Math.min(Number(limit) || 3, 6);
  const visibleQuery = {
    isHidden: { $ne: true },
    isBlocked: { $ne: true },
  };

  const baseQuery = Course.find(visibleQuery)
    .populate("instructor", "name email profileImage verificationDetails")
    .sort({ createdAt: -1 })
    .limit(parsedLimit);

  const visibleCourses = await baseQuery;

  if (visibleCourses.length > 0) {
    return visibleCourses;
  }

  return await Course.find()
    .populate("instructor", "name email profileImage verificationDetails")
    .sort({ createdAt: -1 })
    .limit(parsedLimit);
};

// ================= PUBLIC PLATFORM STATS =================
export const getPlatformStatsService = async () => {
  const { currentMonth, previousMonth } = getMonthRanges();

  const learnerQuery = { role: "student", isBlocked: { $ne: true } };
  const courseQuery = {
    status: "published",
    approvalStatus: "approved",
    isHidden: { $ne: true },
    isBlocked: { $ne: true },
  };
  const mentorQuery = {
    role: "instructor",
    approvalStatus: "approved",
    isBlocked: { $ne: true },
  };

  const [
    activeLearners,
    expertCourses,
    certifiedMentors,
    liveSessions,
    currentLearners,
    previousLearners,
    currentCourses,
    previousCourses,
    currentMentors,
    previousMentors,
    currentLiveSessions,
    previousLiveSessions,
  ] = await Promise.all([
    User.countDocuments(learnerQuery),
    Course.countDocuments(courseQuery),
    User.countDocuments(mentorQuery),
    LiveSession.countDocuments(),
    User.countDocuments({ ...learnerQuery, createdAt: currentMonth }),
    User.countDocuments({ ...learnerQuery, createdAt: previousMonth }),
    Course.countDocuments({ ...courseQuery, createdAt: currentMonth }),
    Course.countDocuments({ ...courseQuery, createdAt: previousMonth }),
    User.countDocuments({ ...mentorQuery, createdAt: currentMonth }),
    User.countDocuments({ ...mentorQuery, createdAt: previousMonth }),
    LiveSession.countDocuments({ createdAt: currentMonth }),
    LiveSession.countDocuments({ createdAt: previousMonth }),
  ]);

  return {
    success: true,
    stats: {
      activeLearners: {
        value: activeLearners,
        growth: formatGrowth(currentLearners, previousLearners),
      },
      expertCourses: {
        value: expertCourses,
        growth: formatGrowth(currentCourses, previousCourses),
      },
      certifiedMentors: {
        value: certifiedMentors,
        growth: formatGrowth(currentMentors, previousMentors),
      },
      liveSessions: {
        value: liveSessions,
        growth: formatGrowth(currentLiveSessions, previousLiveSessions),
      },
    },
  };
};

// ================= PUBLIC TESTIMONIALS =================
export const getTopTestimonialsService = async (limit = 3) => {
  const testimonials = await Review.find({
    rating: { $gte: 4 },
    comment: { $exists: true, $nin: ["", null] },
  })
    .populate("user", "name role profileImage")
    .populate("course", "title status approvalStatus isHidden isBlocked")
    .sort({ rating: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 3, 6));

  return testimonials
    .filter((review) => (
      review.user &&
      review.course &&
      review.course.status === "published" &&
      review.course.approvalStatus === "approved" &&
      !review.course.isHidden &&
      !review.course.isBlocked
    ))
    .slice(0, 3)
    .map((review) => ({
      id: review._id,
      name: review.user.name,
      role: review.course.title,
      quote: review.comment,
      rating: review.rating,
      avatar: review.user.profileImage,
    }));
};

// ================= GET COURSE BY ID =================
export const getCourseByIdService = async (
  courseId,
  userId = null,
  userRole = null
) => {
  const course = await Course.findById(courseId).populate(
    "instructor",
    "name email profileImage verificationDetails"
  );

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // Check visibility for public/students
  if (userRole !== "admin" && (course.instructor._id.toString() !== userId)) {
    // If the student is enrolled in the course, they are authorized to view it
    const isEnrolled = userId ? await Enrollment.exists({ user: userId, course: courseId }) : false;
    if (!isEnrolled) {
      if (course.isBlocked || course.approvalStatus !== "approved" || course.status !== "published" || course.isHidden) {
        const error = new Error("This course is not available.");
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // Get modules
  const modules = await Module.find({ courseId }).sort({
    order: 1,
  });

  // Get lessons
  const lessons = await Lesson.find({ courseId }).sort({
    order: 1,
  });

  // Attach lessons to modules
  const structuredModules = modules.map((module) => ({
    ...module.toObject(),
    lessons: lessons.filter(
      (lesson) =>
        lesson.moduleId.toString() === module._id.toString()
    ),
  }));

  const courseData = {
    ...course.toObject(),
    modules: structuredModules,
    lessonsCount: lessons.length,
    lessons: lessons,
  };

  // ================= STUDENT =================
  if (userRole === "student") {
    const isEnrolled = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    // If not enrolled → hide paid lessons
    if (!isEnrolled) {
      courseData.modules = courseData.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          _id: lesson._id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          isPreviewFree: lesson.isPreviewFree,
          videoUrl: lesson.isPreviewFree
            ? lesson.videoUrl
            : null,
        })),
      }));

      return {
        ...courseData,
        isEnrolled: false,
      };
    }

    return {
      ...courseData,
      isEnrolled: true,
    };
  }

  // ================= INSTRUCTOR =================
  if (
    userRole === "instructor" &&
    course.instructor._id.toString() === userId
  ) {
    return {
      ...courseData,
      isEnrolled: true,
    };
  }

  // ================= ADMIN =================
  if (userRole === "admin") {
    return {
      ...courseData,
      isEnrolled: true,
    };
  }

  // ================= PUBLIC USER =================
  courseData.modules = courseData.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({
      _id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      duration: lesson.duration,
      isPreviewFree: lesson.isPreviewFree,
      videoUrl: lesson.isPreviewFree
        ? lesson.videoUrl
        : null,
    })),
  }));

  return {
    ...courseData,
    isEnrolled: false,
  };
};

export const getCourseReviewsService = async (courseId) => {
  return await Review.find({ course: courseId })
    .populate("user", "name profileImage")
    .sort({ createdAt: -1 });
};

export const submitCourseReviewService = async ({
  courseId,
  userId,
  rating,
  comment,
}) => {
  const isEnrolled = await Enrollment.exists({ user: userId, course: courseId });
  if (!isEnrolled) {
    const error = new Error("Only enrolled students can review this course");
    error.statusCode = 403;
    throw error;
  }

  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
    const error = new Error("Rating must be between 1 and 5");
    error.statusCode = 400;
    throw error;
  }

  const review = await Review.findOneAndUpdate(
    { user: userId, course: courseId },
    { rating: numericRating, comment },
    { upsert: true, new: true, runValidators: true }
  ).populate("user", "name profileImage");

  const stats = await Review.aggregate([
    { $match: { course: review.course } },
    {
      $group: {
        _id: "$course",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats[0]) {
    await Course.findByIdAndUpdate(courseId, {
      averageRating: Number(stats[0].averageRating.toFixed(1)),
      totalReviews: stats[0].totalReviews,
    });
  }

  return review;
};

export const getCourseLessonsService = async ({ courseId, userId = null, userRole = null }) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = userRole === "instructor" && course.instructor.toString() === userId;
  const isAdmin = userRole === "admin";
  const isEnrolled = userId
    ? await Enrollment.exists({ user: userId, course: courseId })
    : false;
  const canViewPaidContent = Boolean(isOwner || isAdmin || isEnrolled);

  const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

  return lessons.map((lesson) => {
    const data = lesson.toObject();
    if (!canViewPaidContent && !data.isPreviewFree) {
      data.videoUrl = null;
    }
    return data;
  });
};

// ================= UPDATE COURSE =================
export const updateCourseService = async ({
  courseId,
  userId,
  updates,
}) => {
  const course = await Course.findById(courseId);

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // Ownership check
  if (course.instructor.toString() !== userId) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    throw error;
  }

  // If course was approved, and it's being updated, set it back to pending
  if (course.approvalStatus === "approved") {
    course.approvalStatus = "pending";
  }

  Object.assign(course, updates);

  await course.save();

  return course;
};

// ================= DELETE COURSE =================
export const deleteCourseService = async (
  courseId,
  userId
) => {
  const course = await Course.findById(courseId);

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // Ownership check
  if (course.instructor.toString() !== userId) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    throw error;
  }

  // Delete related data
  await Module.deleteMany({ courseId });
  await Lesson.deleteMany({ courseId });
  await Enrollment.deleteMany({ course: courseId });
  await Exam.deleteMany({ course: courseId });
  await ExamAttempt.deleteMany({ course: courseId });

  // Delete course
  await course.deleteOne();

  return true;
};
