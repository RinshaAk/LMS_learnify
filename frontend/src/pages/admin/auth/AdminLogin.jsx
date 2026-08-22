import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import React from "react";

import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../../features/auth/authThunk";
import { logout, setCredentials } from "../../../features/auth/authSlice";
import { GoogleLogin } from "@react-oauth/google";
import axiosInstance from "../../../features/axiosInstance";

function AdminLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, token } = useSelector((state) => state.auth);

  React.useEffect(() => {
    if (token && user?.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, token, navigate]);

  // ✅ Formik setup
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
      rememberMe: false,
    },

    validationSchema: Yup.object({
      email: Yup.string()
        .email("Please enter a valid email address")
        .required("Email is required"),

      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required"),
    }),

    onSubmit: async (values) => {
      setIsLoading(true);
      setApiError("");

      try {
        const user = await dispatch(loginUser({
          email: values.email,
          password: values.password,
        })).unwrap();

        // Ensure the role is admin
        if (user.role !== "admin") {
          dispatch(logout());
          setApiError("Access denied. You do not have administrator privileges.");
          return;
        }

        // Store token/user if needed (assuming logic exists in your app)
        // localStorage.setItem("token", res.data.token);

        alert("Welcome to the Admin Dashboard!");
        navigate("/admin/dashboard");
      } catch (err) {
        if (typeof err === "string") {
          setApiError(err);
        } else if (err.response) {
          setApiError(err.response.data.message || "Invalid credentials");
        } else if (err.request) {
          setApiError("Unable to connect to server. Please try again later.");
        } else {
          setApiError("Something went wrong. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* Left Side: Illustration & Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-700/5 to-slate-900/5" />
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-200">
            <ShieldCheck size={14} />
            <span>Administrator Control</span>
          </div>
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Manage the <span className="text-slate-800">Learnify</span> Ecosystem
          </h2>
          <p className="text-slate-600 text-lg mb-10">
            Access powerful tools to monitor performance, manage users, and ensure the quality of educational content across the platform.
          </p>
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
            alt="Admin Illustration"
            className="w-full h-auto shadow-2xl rounded-3xl object-cover min-h-[400px] border border-slate-200 brightness-[0.9] hover:brightness-100 transition-all duration-700"
          />
        </div>
        {/* Abstract shapes */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20">
        <div className="w-full max-w-md">
          {/* Header for Mobile */}
          <div className="lg:hidden mb-12 flex items-center justify-center">
            <img src="/logo.png" alt="Learnify" className="h-10 w-auto" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold mb-3">Admin Login</h2>
            <p className="text-slate-500 text-sm">Access the Learnify admin dashboard to manage your platform.</p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center animate-shake">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-3 shrink-0" />
              {apiError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Admin Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-800 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@learnify.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-slate-50 outline-none transition-all duration-200 ${
                    formik.touched.email && formik.errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 focus:bg-white"
                  }`}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {formik.errors.email}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-xl border bg-slate-50 outline-none transition-all duration-200 ${
                    formik.touched.password && formik.errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {formik.errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-slate-800 focus:ring-slate-800 border-slate-300 rounded cursor-pointer"
                  onChange={formik.handleChange}
                  checked={formik.values.rememberMe}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-xs font-semibold text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password?portal=admin" size="sm" className="text-slate-800 hover:text-black text-xs font-bold">
                Forgot Password?
              </Link>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
            >
              <span>{isLoading ? "Authenticating..." : "Login as Admin"}</span>
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 uppercase tracking-widest text-[10px] font-bold">Admin Verification</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              theme="outline"
              size="large"
              shape="pill"
              width="350"
              onSuccess={async (response) => {
                const token = response.credential;
                try {
                  const res = await axiosInstance.post("/auth/google", {
                    token,
                    role: "admin",
                  });
                  const user = res.data;
                  if (user.role !== "admin") {
                    setApiError("Access denied. Not an administrator account.");
                    return;
                  }
                  dispatch(setCredentials(user));
                  navigate("/admin/dashboard");
                } catch (error) {
                  console.log("Google login error", error);
                  setApiError("Google authentication failed.");
                }
              }}
              onError={() => {
                setApiError("Google Login Failed");
              }}
            />
          </div>

          <div className="text-center mt-12">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4">
              Secure Access Only
            </p>
            <div className="flex justify-center space-x-4">
               <Link to="/login" className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline decoration-slate-200 underline-offset-4">Student Login</Link>
               <Link to="/instructor/login" className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline decoration-slate-200 underline-offset-4">Instructor Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
