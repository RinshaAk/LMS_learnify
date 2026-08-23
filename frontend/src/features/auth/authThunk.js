import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  registerAPI,
  loginAPI,
  verifyOtpAPI,
  sendOtpAPI,
  resendOtpAPI,
  getProfileAPI,
  updateProfileAPI,
} from "./authAPI";
import {
  getPortalMismatchMessage,
  shouldRestorePreviousSession,
} from "./loginFlow";

// Register
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (data, thunkAPI) => {
    try {
      return await registerAPI(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Registration failed");
    }
  }
);

// Login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (data, thunkAPI) => {
    const previousToken = localStorage.getItem("token");
    const previousUser = localStorage.getItem("user");

    try {
      const res = await loginAPI(data);

      if (data.portalRole && res.role !== data.portalRole) {
        if (previousToken) {
          localStorage.setItem("token", previousToken);
        } else {
          localStorage.removeItem("token");
        }

        if (previousUser) {
          localStorage.setItem("user", previousUser);
        } else {
          localStorage.removeItem("user");
        }

        return thunkAPI.rejectWithValue({
          message: getPortalMismatchMessage(res.role),
          code: "ROLE_MISMATCH",
          registeredRole: res.role,
        });
      }

      const authenticatedUser = {
        ...res,
        loginPortal: data.portalRole,
      };

      if (authenticatedUser.token) {
        localStorage.setItem("token", authenticatedUser.token);
      }
      localStorage.setItem("user", JSON.stringify(authenticatedUser));
      return authenticatedUser;
    } catch (error) {
      const responseData = error.response?.data;

      if (shouldRestorePreviousSession(responseData)) {
        if (previousToken) {
          localStorage.setItem("token", previousToken);
        } else {
          localStorage.removeItem("token");
        }

        if (previousUser) {
          localStorage.setItem("user", previousUser);
        } else {
          localStorage.removeItem("user");
        }
      }

      return thunkAPI.rejectWithValue(
        responseData || { message: error.message || "Login failed" }
      );
    }
  }
);

// Verify OTP
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (data, thunkAPI) => {
    try {
      return await verifyOtpAPI(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "OTP verification failed");
    }
  }
);

// Send OTP
export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async (email, thunkAPI) => {
    try {
      return await sendOtpAPI(email);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "OTP send failed");
    }
  }
);

// Resend OTP
export const resendOtp = createAsyncThunk(
  "auth/resendOtp",
  async (email, thunkAPI) => {
    try {
      return await resendOtpAPI(email);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "OTP send failed");
    }
  }
);

// Fetch Profile
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, thunkAPI) => {
    try {
      const res = await getProfileAPI();
      const userData = res.user || res.data || res;
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch profile");
    }
  }
);

// Update Profile
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, thunkAPI) => {
    try {
      const res = await updateProfileAPI(profileData);
      localStorage.setItem("user", JSON.stringify(res));
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Profile update failed");
    }
  }
);
