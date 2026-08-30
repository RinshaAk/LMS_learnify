import axiosInstance from '../features/axiosInstance';

export const getAllUsers = async () => {
  const response = await axiosInstance.get('/admin/users');
  return response.data;
};

export const getInstructorRequests = async () => {
  const response = await axiosInstance.get('/admin/instructor-requests');
  return response.data;
};

export const approveInstructor = async (id) => {
  const response = await axiosInstance.patch(`/admin/approve-instructor/${id}`);
  return response.data;
};

export const rejectInstructor = async (id) => {
  const response = await axiosInstance.patch(`/admin/reject-instructor/${id}`);
  return response.data;
};

export const getAllPayments = async () => {
  const response = await axiosInstance.get('/admin/payments');
  return response.data;
};

export const getPaymentById = async (id) => {
  const response = await axiosInstance.get(`/admin/payments/${id}`);
  return response.data;
};

export const getBlockedUsers = async () => {
  const response = await axiosInstance.get('/admin/blocked-users');
  return response.data;
};

export const blockUser = async (id, reason) => {
  const response = await axiosInstance.patch(`/admin/block-user/${id}`, { reason });
  return response.data;
};

export const unblockUser = async (id) => {
  const response = await axiosInstance.patch(`/admin/unblock-user/${id}`);
  return response.data;
};

export const getEarnings = async () => {
  const response = await axiosInstance.get('/admin/earnings');
  return response.data;
};

export const getAllCourses = async () => {
  const response = await axiosInstance.get('/admin/courses');
  return response.data;
};

export const updateCourseStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/admin/courses/${id}/status`, { status });
  return response.data;
};

export const getVideoPlaybackUrl = async ({ videoUrl, courseId, lessonId }) => {
  const response = await axiosInstance.post('/uploads/video/playback-url', {
    videoUrl,
    courseId,
    lessonId,
  });
  return response.data;
};

export const getActivityFeed = async () => {
  const response = await axiosInstance.get('/admin/activity-feed');
  return response.data;
};

export const getReportsData = async (fromDate, toDate) => {
  const response = await axiosInstance.get('/admin/reports', {
    params: { fromDate, toDate }
  });
  return response.data;
};

export const getAdminStats = async () => {
  const response = await axiosInstance.get('/admin/stats');
  return response.data;
};

export const getAllCategories = async () => {
  const response = await axiosInstance.get('/admin/categories');
  return response.data;
};

export const addCategory = async (categoryData) => {
  const response = await axiosInstance.post('/admin/categories', categoryData);
  return response.data;
};

export const updateCategory = async (id, categoryData) => {
  const response = await axiosInstance.put(`/admin/categories/${id}`, categoryData);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await axiosInstance.delete(`/admin/categories/${id}`);
  return response.data;
};

export const getAllOffers = async () => {
  const response = await axiosInstance.get('/admin/offers');
  return response.data;
};

export const getInstructorAvailability = async () => {
  const response = await axiosInstance.get('/admin/availability');
  return response.data;
};

export const getAdminLiveSessions = async () => {
  const response = await axiosInstance.get('/admin/live-sessions');
  return response.data;
};

export default {
  getAllUsers,
  getInstructorRequests,
  approveInstructor,
  rejectInstructor,
  getAllPayments,
  getPaymentById,
  getBlockedUsers,
  blockUser,
  unblockUser,
  getEarnings,
  getAllCourses,
  updateCourseStatus,
  getVideoPlaybackUrl,
  getActivityFeed,
  getReportsData,
  getAdminStats,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllOffers,
  getInstructorAvailability,
  getAdminLiveSessions,
};
