import axiosInstance from '../features/axiosInstance';

export const getStudentExams = async () => {
  try {
    const response = await axiosInstance.get('/exams/student');
    return response.data;
  } catch (error) {
    console.error('Error fetching student exams:', error);
    throw error;
  }
};

export const getExamHistory = async (examId) => {
  try {
    const response = await axiosInstance.get(`/exams/${examId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching exam history:', error);
    throw error;
  }
};

export const submitExamAttempt = async (examId, attemptData) => {
  try {
    const payload = typeof attemptData === 'object' ? attemptData : { score: attemptData };
    const response = await axiosInstance.post(`/exams/${examId}/submit`, payload);
    return response.data;
  } catch (error) {
    console.error('Error submitting exam attempt:', error);
    throw error;
  }
};

export const requestExtraAttempt = async (examId, reason) => {
  try {
    const response = await axiosInstance.post(`/exams/${examId}/request`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error requesting extra attempt:', error);
    throw error;
  }
};

export const checkExamEligibility = async (examId) => {
  try {
    const response = await axiosInstance.get(`/exams/${examId}/eligibility`);
    return response.data;
  } catch (error) {
    console.error('Error checking exam eligibility:', error);
    throw error;
  }
};

export const getInstructorExams = async () => {
  try {
    const response = await axiosInstance.get('/exams/instructor');
    return response.data;
  } catch (error) {
    console.error('Error fetching instructor exams:', error);
    throw error;
  }
};

export const createExam = async (examData) => {
  try {
    const response = await axiosInstance.post('/exams/create', examData);
    return response.data;
  } catch (error) {
    console.error('Error creating exam:', error);
    throw error;
  }
};

export const getExamAttempts = async (examId) => {
  try {
    const response = await axiosInstance.get(`/exams/${examId}/attempts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    throw error;
  }
};

export const gradeAttempt = async (attemptId, score, feedback) => {
  try {
    const response = await axiosInstance.put(`/exams/attempts/${attemptId}/grade`, { score, feedback });
    return response.data;
  } catch (error) {
    console.error('Error grading attempt:', error);
    throw error;
  }
};

export const uploadExamResource = async (file, courseId) => {
  try {
    const formData = new FormData();
    formData.append('resource', file);
    if (courseId) formData.append('courseId', courseId);
    const response = await axiosInstance.post('/uploads/resource', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading assessment resource:', error);
    throw error;
  }
};

export const getExamResourceUrl = async (examId, key) => {
  try {
    const response = await axiosInstance.get(`/exams/${examId}/resource-url`, {
      params: key ? { key } : {},
    });
    return response.data;
  } catch (error) {
    console.error('Error getting assessment resource URL:', error);
    throw error;
  }
};

export const approveAttempt = async (attemptId, status, feedback = '') => {
  try {
    const response = await axiosInstance.patch(`/exams/attempts/${attemptId}/approval`, { status, feedback });
    return response.data;
  } catch (error) {
    console.error('Error updating attempt approval:', error);
    throw error;
  }
};

export const updateExam = async (examId, examData) => {
  try {
    const response = await axiosInstance.put(`/exams/${examId}`, examData);
    return response.data;
  } catch (error) {
    console.error('Error updating exam:', error);
    throw error;
  }
};

export const publishExam = async (examId) => {
  try {
    const response = await axiosInstance.patch(`/exams/${examId}/publish`);
    return response.data;
  } catch (error) {
    console.error('Error publishing exam:', error);
    throw error;
  }
};

export const unpublishExam = async (examId) => {
  try {
    const response = await axiosInstance.patch(`/exams/${examId}/unpublish`);
    return response.data;
  } catch (error) {
    console.error('Error unpublishing exam:', error);
    throw error;
  }
};

export const duplicateExam = async (examId) => {
  try {
    const response = await axiosInstance.post(`/exams/${examId}/duplicate`);
    return response.data;
  } catch (error) {
    console.error('Error duplicating exam:', error);
    throw error;
  }
};

export const deleteExam = async (examId) => {
  try {
    const response = await axiosInstance.delete(`/exams/${examId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting exam:', error);
    throw error;
  }
};

export default {
  getStudentExams,
  getExamHistory,
  submitExamAttempt,
  requestExtraAttempt,
  checkExamEligibility,
  getInstructorExams,
  createExam,
  uploadExamResource,
  getExamResourceUrl,
  getExamAttempts,
  gradeAttempt,
  approveAttempt,
  updateExam,
  publishExam,
  unpublishExam,
  duplicateExam,
  deleteExam
};
