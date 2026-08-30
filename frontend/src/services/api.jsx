import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      error.userMessage = "The request took too long. Please try again.";
    }
    return Promise.reject(error);
  }
);

export default API;
