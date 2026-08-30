import { asyncHandler } from "../middleware/trycatchmiddleware.js";

import {
  createCourseService,
  deleteCourseService,
  getCourseByIdService,
  getCourseLessonsService,
  getCourseReviewsService,
  getCoursesService,
  getLandingCoursesService,
  getPlatformStatsService,
  getTopTestimonialsService,
  submitCourseReviewService,
  updateCourseService,
} from "../services/courseServices.js";


// âœ… Create Course
export const createCourse = async (req, res) => {

  const course = await createCourseService({
    ...req.body,
    instructor: req.user.id,
  });

  res.status(201).json({
    success: true,
    course,
  });
};


// âœ… Get all courses
export const getCourses = async (req, res) => {

  const result = await getCoursesService(req.query);

  res.status(200).json({
    success: true,
    courses: result.courses,
    pagination: result.pagination,
  });
};


// âœ… Get single course
export const getLandingCourses = async (req, res) => {
  const courses = await getLandingCoursesService(req.query.limit);

  res.status(200).json({
    success: true,
    courses,
  });
};

export const getPlatformStats = async (req, res) => {
  const stats = await getPlatformStatsService();

  res.status(200).json(stats);
};

export const getTopTestimonials = async (req, res) => {
  const testimonials = await getTopTestimonialsService(req.query.limit);

  res.status(200).json({
    success: true,
    testimonials,
  });
};

export const getCourseById = async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const userRole = req.user ? req.user.role : null;

  const course = await getCourseByIdService(req.params.id, userId, userRole);

  res.status(200).json({
    success: true,
    course,
  });
};


// âœ… Update Course
export const getCourseReviews = async (req, res) => {
  const result = await getCourseReviewsService(req.params.id, req.query);

  res.status(200).json({
    success: true,
    reviews: result.reviews,
    pagination: result.pagination,
  });
};

export const submitCourseReview = async (req, res) => {
  const review = await submitCourseReviewService({
    courseId: req.params.id,
    userId: req.user.id,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  res.status(201).json({
    success: true,
    review,
  });
};

export const getCourseLessons = async (req, res) => {
  const lessons = await getCourseLessonsService({
    courseId: req.params.id,
    userId: req.user?.id,
    userRole: req.user?.role,
  });

  res.status(200).json({
    success: true,
    lessons,
  });
};

export const updateCourse = async (req, res) => {

  const updated = await updateCourseService({
    courseId: req.params.id,
    userId: req.user.id,
    updates: req.body,
  });

  res.status(200).json({
    success: true,
    updated,
  });
};


// âœ… Delete Course
export const deleteCourse = async (req, res) => {

  await deleteCourseService(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
};

