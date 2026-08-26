import axiosInstance from '../features/axiosInstance';

export const getMyLiveSessions = async () => {
  try {
    const response = await axiosInstance.get('/users/my-live-sessions');
    return response.data;
  } catch (error) {
    console.error('Error fetching my live sessions:', error);
    throw error;
  }
};

export const getInstructorLiveSessions = async () => {
  try {
    const response = await axiosInstance.get('/live/my-sessions');
    return response.data;
  } catch (error) {
    console.error('Error fetching instructor live sessions:', error);
    throw error;
  }
};

export const createLiveSession = async (sessionData) => {
  const response = await axiosInstance.post('/live', sessionData);
  return response.data;
};

export const startLiveSession = async (id) => {
  const response = await axiosInstance.put(`/live/${id}/start`);
  return response.data;
};

export const getLiveSessionStatus = async (id) => {
  const response = await axiosInstance.get(`/live/${id}/status`);
  return response.data;
};

export const getBroadcastDetails = async (id) => {
  const response = await axiosInstance.get(`/live/${id}/broadcast`);
  return response.data;
};

export const endLiveSession = async (id) => {
  const response = await axiosInstance.put(`/live/${id}/end`);
  return response.data;
};

export const cancelLiveSession = async (id, reason = '') => {
  const response = await axiosInstance.patch(`/live/${id}/cancel`, { reason });
  return response.data;
};

export const deleteLiveSession = async (id) => {
  const response = await axiosInstance.delete(`/live/${id}`);
  return response.data;
};

export default {
  getMyLiveSessions,
  getInstructorLiveSessions,
  createLiveSession,
  startLiveSession,
  getLiveSessionStatus,
  getBroadcastDetails,
  endLiveSession,
  cancelLiveSession,
  deleteLiveSession,
};
