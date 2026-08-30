import axios from "axios";

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      error.userMessage = "The request took too long. Please try again.";
    }

    if (error.response && error.response.status === 401 && !error.config.url.includes("/auth/")) {
      console.log("Unauthorized! Logging out...");

      const isAuthRequest = error.config && (
        error.config.url.includes("/auth/login") ||
        error.config.url.includes("/auth/register") ||
        error.config.url.includes("/auth/google")
      );

      if (!isAuthRequest) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        const currentPath = window.location.pathname;
        let redirectPath = "/login";

        if (currentPath.startsWith("/admin")) {
          redirectPath = "/admin/login";
        } else if (currentPath.startsWith("/instructor")) {
          redirectPath = "/instructor/login";
        }

        window.location.href = redirectPath;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
