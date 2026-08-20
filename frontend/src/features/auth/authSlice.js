import { createSlice } from "@reduxjs/toolkit";
import {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  fetchProfile,
  updateProfile,
} from "./authThunk";

// Get initial state from localStorage if available
const userFromStorage = localStorage.getItem("user")
  ? JSON.parse(localStorage.getItem("user"))
  : null;
const tokenFromStorage = localStorage.getItem("token")
  ? localStorage.getItem("token")
  : null;

const initialState = {
  user: userFromStorage,
  isAuthenticated: !!tokenFromStorage,
  loading: false,
  error: null,
  success: false,
  otpSent: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.success = false;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    setCredentials: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.success = true;
      if (action.payload?.token) {
        localStorage.setItem("token", action.payload.token);
      }
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    clearState: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // REGISTER
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.success = true;
        state.otpSent = false;
        if (action.payload?.token) {
          localStorage.setItem("token", action.payload.token);
        }
        localStorage.setItem("user", JSON.stringify(action.payload));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.success = true;
        if (action.payload?.token) {
          localStorage.setItem("token", action.payload.token);
        }
        localStorage.setItem("user", JSON.stringify(action.payload));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // FETCH PROFILE
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem("user", JSON.stringify(action.payload));
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.success = true;
        localStorage.setItem("user", JSON.stringify(action.payload));
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // VERIFY OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
        state.otpSent = false;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // RESEND OTP
      .addCase(resendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpSent = true;
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, setCredentials, clearState } = authSlice.actions;
export { registerUser, loginUser, verifyOtp, resendOtp, fetchProfile, updateProfile };
export default authSlice.reducer;
