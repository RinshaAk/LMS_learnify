import axiosInstance from "../axiosInstance";

// Get all courses (with filters)
export const getAllCourses = async (filters = {}) => {
  const response = await axiosInstance.get("/courses", { params: filters });
  return response.data;
};

// Get featured courses (limited list for landing page)
export const getFeaturedCourses = async (limit = 6) => {
  const response = await axiosInstance.get("/courses", {
    params: { featured: true, limit },
  });
  return response.data;
};

// Get courses for landing page program section
export const getLandingCourses = async (limit = 3) => {
  const response = await axiosInstance.get("/courses/landing-courses", {
    params: { limit },
  });
  return response.data;
};

// Get public platform stats for landing page
export const getPlatformStats = async () => {
  const response = await axiosInstance.get("/courses/platform-stats");
  return response.data;
};

// Get public testimonials for landing page
export const getTopTestimonials = async (limit = 3) => {
  const response = await axiosInstance.get("/courses/testimonials", {
    params: { limit },
  });
  return response.data;
};

// Get course by ID with details
export const getCourseById = async (courseId) => {
  const response = await axiosInstance.get(`/courses/${courseId}`);
  return response.data;
};

// Get courses enrolled by student
export const getEnrolledCourses = async () => {
  const response = await axiosInstance.get("/users/enrollments");
  return response.data;
};

// Enroll in a course
export const enrollCourse = async (courseId) => {
  const response = await axiosInstance.post("/users/enroll", { courseId });
  return response.data;
};

// Get course reviews
export const getCourseReviews = async (courseId) => {
  const response = await axiosInstance.get(`/courses/${courseId}/reviews`);
  return response.data;
};

// Submit course review
export const submitCourseReview = async (courseId, reviewData) => {
  const response = await axiosInstance.post(`/courses/${courseId}/reviews`, reviewData);
  return response.data;
};

// Get course lessons
export const getCourseLessons = async (courseId) => {
  const response = await axiosInstance.get(`/courses/${courseId}/lessons`);
  return response.data;
};

// Create new course (for instructors)
export const createCourse = async (courseData) => {
  const response = await axiosInstance.post("/courses", courseData);
  return response.data;
};

// Update course (for instructors)
export const updateCourse = async (courseId, courseData) => {
  const response = await axiosInstance.put(`/courses/${courseId}`, courseData);
  return response.data;
};

export default {
  getAllCourses,
  getFeaturedCourses,
  getLandingCourses,
  getPlatformStats,
  getTopTestimonials,
  getCourseById,
  getEnrolledCourses,
  enrollCourse,
  getCourseReviews,
  submitCourseReview,
  getCourseLessons,
  createCourse,
  updateCourse,
};
