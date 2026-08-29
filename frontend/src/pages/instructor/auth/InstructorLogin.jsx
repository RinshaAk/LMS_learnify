import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Briefcase } from "lucide-react";
import { useDispatch } from "react-redux";
import { loginUser } from "../../../features/auth/authThunk";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from 'react-hot-toast';
import axiosInstance from "../../../features/axiosInstance";
import { setCredentials } from "../../../features/auth/authSlice";
import {
  getPortalMismatchMessage,
  getPostLoginPath,
} from "../../../features/auth/loginFlow";

function InstructorLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Formik setup
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
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
          portalRole: "instructor",
        })).unwrap();

        const nextPath = getPostLoginPath(user, "instructor");

        if (!nextPath) {
          const errorMsg = getPortalMismatchMessage(user.role);
          toast.error(errorMsg);
          setApiError(errorMsg);
          return;
        }

        toast.success("Welcome back, Instructor!");
        navigate(nextPath);
      } catch (err) {
        const errorMsg = typeof err === 'string' ? err : (err?.message || "Invalid credentials");
        toast.error(errorMsg);
        setApiError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* Left Side: Illustration & Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-blue-500/5" />
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Briefcase size={14} />
            <span>Instructor Portal</span>
          </div>
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Share Your Knowledge on <span className="text-indigo-600">StackVerseHub</span>
          </h2>
          <p className="text-slate-600 text-lg mb-10">
            Empower learners worldwide. Manage your courses, track student progress, and grow your teaching brand.
          </p>
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
            alt="Instructor Learning Environment"
            className="w-full h-auto shadow-2xl rounded-3xl object-cover min-h-[400px] border border-slate-100 hover:scale-[1.01] transition-all duration-700"
          />
        </div>
        {/* Abstract shapes */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20">
        <div className="w-full max-w-md">
          {/* Header for Mobile */}
          <div className="lg:hidden mb-12 flex items-center justify-center">
            <img src="/logo.png" alt="StackVerseHub" className="h-10 w-auto" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold mb-3">Instructor Login</h2>
            <p className="text-slate-500">Welcome back! Sign in to manage your academy.</p>
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
              <label className="text-sm font-semibold text-slate-700 ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="instructor@stackversehub.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-slate-50 outline-none transition-all duration-200 ${
                    formik.touched.email && formik.errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white"
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
                <Link to="/forgot-password?portal=instructor" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs font-bold">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
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
                      : "border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white"
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

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
            >
              <span>{isLoading ? "Authenticating..." : "Instructor Sign In"}</span>
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Or continue with</span>
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
                  const res = await axiosInstance.post("/auth/google/instructor", {
                    token,
                  });
                  const user = res.data;
                  const nextPath = getPostLoginPath(user, "instructor");

                  if (!nextPath) {
                    setApiError(getPortalMismatchMessage(user.role));
                    return;
                  }
                  dispatch(setCredentials({ ...user, loginPortal: "instructor" }));
                  navigate(nextPath);
                } catch (error) {
                  console.log("Google login error", error);
                  setApiError("Google authentication failed. Please try again.");
                }
              }}
              onError={() => {
                console.log("Google Login Failed");
                setApiError("Google Login Failed");
              }}
            />
          </div>

          <div className="text-center mt-10">
            <p className="text-sm text-slate-500">
              New to StackVerseHub?{" "}
              <Link to="/instructor/register" className="text-indigo-600 font-bold hover:underline ml-1">
                Apply to teach
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorLogin;
