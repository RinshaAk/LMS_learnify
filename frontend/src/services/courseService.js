import axiosInstance from '../features/axiosInstance';

// Get all courses (with filters)
export const getAllCourses = async (filters = {}) => {
  try {
    const response = await axiosInstance.get('/courses', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

// Get featured courses (limited list for landing page)
export const getFeaturedCourses = async (limit = 6) => {
  try {
    const response = await axiosInstance.get('/courses', { 
      params: { featured: true, limit } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching featured courses:', error);
    throw error;
  }
};

// Get course by ID with details
export const getCourseById = async (courseId) => {
  try {
    const response = await axiosInstance.get(`/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
};

// Get courses enrolled by student
export const getEnrolledCourses = async () => {
  try {
    const response = await axiosInstance.get('/users/enrollments');
    return response.data;
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    throw error;
  }
};

// Enroll in a course
export const enrollCourse = async (courseId) => {
  try {
    const response = await axiosInstance.post('/users/enroll', { courseId });
    return response.data;
  } catch (error) {
    console.error('Error enrolling in course:', error);
    throw error;
  }
};

// Get course reviews
export const getCourseReviews = async (courseId) => {
  try {
    const response = await axiosInstance.get(`/courses/${courseId}/reviews`);
    return response.data;
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    throw error;
  }
};

// Submit course review
export const submitCourseReview = async (courseId, reviewData) => {
  try {
    const response = await axiosInstance.post(`/courses/${courseId}/reviews`, reviewData);
    return response.data;
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

// Get course lessons
export const getCourseLessons = async (courseId) => {
  try {
    const response = await axiosInstance.get(`/courses/${courseId}/lessons`);
    return response.data;
  } catch (error) {
    console.error('Error fetching course lessons:', error);
    throw error;
  }
};

export const getVideoPlaybackUrl = async ({ videoUrl, courseId, lessonId }) => {
  try {
    const response = await axiosInstance.post('/uploads/video/playback-url', {
      videoUrl,
      courseId,
      lessonId,
    });
    return response.data;
  } catch (error) {
    console.error('Error loading video playback URL:', error);
    throw error;
  }
};

// Create new course (for instructors)
export const createCourse = async (courseData) => {
  try {
    const response = await axiosInstance.post('/courses', courseData);
    return response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// Update course (for instructors)
export const updateCourse = async (courseId, courseData) => {
  try {
    const response = await axiosInstance.put(`/courses/${courseId}`, courseData);
    return response.data;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export default {
  getAllCourses,
  getFeaturedCourses,
  getCourseById,
  getEnrolledCourses,
  enrollCourse,
  getCourseReviews,
  submitCourseReview,
  getCourseLessons,
  getVideoPlaybackUrl,
  createCourse,
  updateCourse,
};
