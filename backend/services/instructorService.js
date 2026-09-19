import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Certificate from "../models/Certificate.js";
import { generateCertificatePDF } from "../utils/pdfGenerator.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";


// ✅ Create Basic Course (Draft)
export const createCourseDraftService = async (instructorId, courseData) => {
  const title = String(courseData.title || "").trim();

  if (!title) {
    const err = new Error("Course title is required");
    err.statusCode = 400;
    throw err;
  }

  const existingCourse = await Course.findOne({ title });

  if (existingCourse) {
    const err = new Error("Course title already exists");
    err.statusCode = 409;
    throw err;
  }

  const course = await Course.create({
    ...courseData,
    title,
    instructor: instructorId,
    status: "draft",
  });

  return course;
};

// ✅ Add Module to Course
export const addModuleService = async (instructorId, courseId, moduleData) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  const moduleCount = await Module.countDocuments({ courseId });
  const newModule = await Module.create({
    ...moduleData,
    courseId,
    order: moduleCount + 1,
  });

  return newModule;
};

// ✅ Add Lesson to Module
export const addLessonService = async (instructorId, courseId, moduleId, lessonData) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  const module = await Module.findById(moduleId);
  if (!module) throw new Error("Module not found");

  const lessonCount = await Lesson.countDocuments({ moduleId });
  const lesson = await Lesson.create({
    title: lessonData.title,
    description: lessonData.description,
    videoUrl: lessonData.videoUrl,
    duration: lessonData.duration || "0:00",
    isPreviewFree: lessonData.isPreviewFree || false,
    resources: lessonData.resources || [],
    courseId,
    moduleId,
    order: lessonCount + 1,
  });

  return lesson;
};

// ✅ Publish Course (Submit for Approval)
export const publishCourseService = async (instructorId, courseId) => {
  const course = await Course.findById(courseId).populate({
    path: "modules",
    populate: { path: "lessons" }
  });

  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }
  if (course.instructor.toString() !== instructorId) {
    const err = new Error("Not authorized");
    err.statusCode = 403;
    throw err;
  }

  // Validation: Ensure course has content before publishing
  if (!course.thumbnail || course.thumbnail.includes("unsplash.com/photo-1498050108023-c5249f4df085")) {
    const err = new Error("Please upload a professional course thumbnail before publishing.");
    err.statusCode = 400;
    throw err;
  }
  if (!course.description || course.description.trim() === "") {
    const err = new Error("Course description is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!course.price || course.price <= 0) {
    const err = new Error("Please set a valid price for the course.");
    err.statusCode = 400;
    throw err;
  }
  if (!course.category) {
    const err = new Error("Course category is required.");
    err.statusCode = 400;
    throw err;
  }
  
  if (!course.modules || course.modules.length === 0) {
    const err = new Error("Course must have at least one module before publishing.");
    err.statusCode = 400;
    throw err;
  }
  
  const hasLessons = course.modules.some(m => m.lessons && m.lessons.length > 0);
  if (!hasLessons) {
    const err = new Error("Each module must have at least one lesson before publishing.");
    err.statusCode = 400;
    throw err;
  }

  // Ensure all lessons have videos
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (!lesson.videoUrl) {
        const err = new Error(`Lesson "${lesson.title}" in module "${module.title}" is missing a video.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  // Set status to published and approvalStatus to pending
  course.status = "published";
  course.approvalStatus = "pending";
  await course.save();

  return course;
};
const parseDurationToSeconds = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0] * 60;
  }
  return 0;
};

const formatSecondsToDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// ✅ Get Instructor Courses
export const getInstructorCoursesService = async (instructorId) => {
  const courses = await Course.find({ instructor: instructorId })
    .populate({
      path: "modules",
      populate: { path: "lessons" }
    })
    .sort({ createdAt: -1 });

  // Update counts and durations dynamically
  const updatedCourses = await Promise.all(courses.map(async (course) => {
    const enrolledCount = await Enrollment.countDocuments({ course: course._id });
    
    // Get all lessons for this course
    const lessons = await Lesson.find({ courseId: course._id });
    let totalSeconds = 0;
    lessons.forEach(lesson => {
      totalSeconds += parseDurationToSeconds(lesson.duration);
    });
    const realDuration = formatSecondsToDuration(totalSeconds);

    // Save if changed to persist
    if (course.enrolledStudentsCount !== enrolledCount || course.duration !== realDuration) {
      course.enrolledStudentsCount = enrolledCount;
      course.duration = realDuration;
      await course.save();
    }

    return course;
  }));

  return {
    all: updatedCourses,
    approved: updatedCourses.filter(c => c.approvalStatus === "approved"),
    pending: updatedCourses.filter(c => c.approvalStatus === "pending"),
    rejected: updatedCourses.filter(c => c.approvalStatus === "rejected"),
    drafts: updatedCourses.filter(c => c.status === "draft")
  };
};

// ✅ Get Single Course Details for Instructor
export const getCourseDetailsService = async (instructorId, courseId) => {
  const course = await Course.findById(courseId).populate({
    path: "modules",
    populate: { path: "lessons" }
  });

  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  return course;
};

// ✅ Update Course
export const updateCourseService = async (instructorId, courseId, updateData) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  // If course was already approved, and major info is being updated, set it back to pending
  // Fields that trigger re-approval: title, description, price, category, level, thumbnail
  const majorFields = ["title", "description", "price", "category", "level", "thumbnail", "status"];
  const isMajorUpdate = Object.keys(updateData).some(key => majorFields.includes(key));

  if (course.approvalStatus === "approved" && isMajorUpdate) {
    course.approvalStatus = "pending";
  }

  // Update fields
  Object.assign(course, updateData);
  
  await course.save();

  return course;
};

// ✅ Update Lesson
export const updateLessonService = async (instructorId, courseId, lessonId, updateData) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  const lesson = await Lesson.findByIdAndUpdate(
    lessonId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!lesson) throw new Error("Lesson not found");
  return lesson;
};

// ✅ Delete Course
export const deleteCourseService = async (instructorId, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  if (course.instructor.toString() !== instructorId) throw new Error("Not authorized");

  await Course.findByIdAndDelete(courseId);
  // Optionally delete related modules and lessons here
  await Module.deleteMany({ courseId });
  await Lesson.deleteMany({ courseId });
  await Exam.deleteMany({ course: courseId });
  await ExamAttempt.deleteMany({ course: courseId });

  return { message: "Course deleted successfully" };
};

// ✅ Get Instructor Dashboard Service
export const getInstructorDashboardService = async (instructorId) => {
  // Get all instructor courses
  const courses = await Course.find({
    instructor: instructorId,
  }).sort({ createdAt: -1 });

  // Update counts and durations dynamically
  const updatedCourses = await Promise.all(courses.map(async (course) => {
    const enrolledCount = await Enrollment.countDocuments({ course: course._id });
    const lessons = await Lesson.find({ courseId: course._id });
    let totalSeconds = 0;
    lessons.forEach(lesson => {
      totalSeconds += parseDurationToSeconds(lesson.duration);
    });
    const realDuration = formatSecondsToDuration(totalSeconds);

    if (course.enrolledStudentsCount !== enrolledCount || course.duration !== realDuration) {
      course.enrolledStudentsCount = enrolledCount;
      course.duration = realDuration;
      await course.save();
    }

    return course;
  }));

  const courseIds = updatedCourses.map((course) => course._id);

  // Get all enrollments for instructor courses
  const enrollments = await Enrollment.find({
    course: { $in: courseIds },
  })
    .populate("user", "name email profileImage")
    .populate("course", "title price discountPrice thumbnail");

  // Total students
  const totalStudents = enrollments.length;

  // Total earnings
  let totalEarnings = 0;
  enrollments.forEach((enrollment) => {
    if (enrollment.course?.price) {
      totalEarnings += enrollment.course.price;
    }
  });

  // Recent courses
  const recentCourses = updatedCourses.slice(0, 5);

  // Recent students (unique users)
  const uniqueStudentIds = [...new Set(enrollments.map(e => e.user?._id?.toString()))];
  const totalUniqueStudents = uniqueStudentIds.length;

  return {
    totalCourses: updatedCourses.length,
    publishedCourses: updatedCourses.filter(c => c.status === "published").length,
    totalStudents: totalUniqueStudents,
    enrolledStudents: totalStudents,
    totalEarnings,
    recentCourses,
    courses: updatedCourses
  };
};

export const getInstructorStudentsService = async (instructorId) => {
  const courses = await Course.find({ instructor: instructorId });
  const courseIds = courses.map(c => c._id);

  const enrollments = await Enrollment.find({ course: { $in: courseIds } })
    .populate("user", "name email profileImage")
    .populate("course", "title price");

  return enrollments.map(e => ({
    id: e._id,
    studentId: e.user?._id,
    name: e.user?.name,
    email: e.user?.email,
    avatar: e.user?.profileImage,
    courseId: e.course?._id,
    courseName: e.course?.title,
    purchaseDate: e.createdAt,
    progress: e.progress || 0,
    status: (e.completionStatus === 'completed' || e.completed) ? 'Completed' : 'Active',
    completionStatus: e.completionStatus || (e.completed ? 'completed' : 'in-progress'),
  }));
};

export const completeStudentCourseService = async (instructorId, courseId, studentId) => {
  // 1. Fetch course
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");

  // 2. Authorization check: must be owner instructor
  if (course.instructor.toString() !== instructorId) {
    throw new Error("You are not authorized to mark completion for this course");
  }

  // 3. Fetch enrollment
  const enrollment = await Enrollment.findOne({ user: studentId, course: courseId });
  if (!enrollment) throw new Error("Enrollment not found");

  // 4. Update enrollment
  enrollment.completed = true;
  enrollment.completionStatus = "completed";
  enrollment.completedAt = new Date();
  await enrollment.save();

  // 5. Generate certificate data
  let certificate = await Certificate.findOne({ student: studentId, course: courseId });
  if (certificate) {
    // If it already exists, just return it
    return certificate;
  }

  // Fetch student info
  const student = await User.findById(studentId);
  if (!student) throw new Error("Student not found");

  // Fetch instructor info
  const instructorObj = await User.findById(instructorId);
  const instructorName = instructorObj?.name || "Authorized Instructor";

  const certificateNumber = `LERN-${crypto.createHash("md5").update(`${studentId}-${courseId}-${Date.now()}`).digest("hex").toUpperCase().substring(0, 10)}`;

  // Create certificate record
  certificate = new Certificate({
    student: studentId,
    studentId: studentId,
    course: courseId,
    courseId: courseId,
    instructor: instructorId,
    instructorId: instructorId,
    certificateId: certificateNumber,
    certificateCode: certificateNumber,
    certificateNumber: certificateNumber,
    issueDate: new Date(),
    completionDate: new Date(),
    studentName: student.name,
    courseTitle: course.title,
    status: "pending",
    courseCompleted: true,
  });

  // Save to database
  await certificate.save();

  return certificate;
};

export const getReviewHistory = async (instructorId) => {
  // Real implementation for backend
  // return await Review.find({ instructor: instructorId }).populate('course student');
  return []; 
};
