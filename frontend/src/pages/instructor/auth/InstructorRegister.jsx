import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { registerUser, resendOtp, verifyOtp } from "../../../features/auth/authThunk";
import { clearState } from "../../../features/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2, Briefcase } from "lucide-react";
import { toast } from 'react-hot-toast';
function InstructorRegister() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error: reduxError } = useSelector((state) => state.auth);

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ⏱️ resend timer
  const [timer, setTimer] = useState(0);

  // Clear global error on mount
  useEffect(() => {
    dispatch(clearState());
  }, [dispatch]);

  // Sync redux error with local error
  useEffect(() => {
    if (reduxError) {
      setError(typeof reduxError === "string" ? reduxError : reduxError.message || "An error occurred");
    }
  }, [reduxError]);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
    },

    validationSchema: Yup.object({
      name: Yup.string().required("Full name is required"),
      email: Yup.string().email("Please enter a valid email address").required("Email is required"),

      otp: Yup.string()
        .length(6, "Verification code must be 6 digits")
        .when("isOtpSent", {
            is: true,
            then: (schema) => schema.required("Verification code is required"),
        }),

      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required"),

      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords do not match")
        .required("Please confirm your password"),
    }),

    onSubmit: async (values) => {
      try {
        const result = await dispatch(registerUser({
          name: values.name,
          email: values.email,
          password: values.password,
          role: "instructor",
        }));

        if (result.type === "auth/registerUser/fulfilled") {
          toast.success("Instructor Registration successful! Please complete your verification.");
          navigate("/instructor/login");
        } else {
          toast.error(result.payload || "Registration failed. Please try again.");
        }
      } catch (err) {
        setError(err || "Registration failed. Please try again.");
      }
    },
  });

  // ⏱️ Timer logic
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Send OTP
  const handleSendOtp = async () => {
    // Mark fields as touched to show validation errors
    formik.setFieldTouched("name", true);
    formik.setFieldTouched("email", true);

    // Check if there are any validation errors for name or email
    if (formik.errors.name || formik.errors.email || !formik.values.email || !formik.values.name) {
      return setError("Please provide a valid name and work email to receive a code.");
    }

    try {
      await dispatch(resendOtp(formik.values.email)).unwrap();
      setIsOtpSent(true);
      setTimer(30); // start 30 sec timer
      setError("");
    } catch (err) {
      setError(err || "Failed to send verification code. Please check your email.");
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    try {
      await dispatch(resendOtp(formik.values.email)).unwrap();
      setTimer(30);
      setError("");
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Failed to resend code.");
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpValue = String(formik.values.otp || "").trim();
    if (!otpValue || otpValue.length !== 6) {
        return setError("Please enter the 6-digit verification code.");
    }
    
    if (loading) return; // Prevent multiple calls

    try {
      await dispatch(
        verifyOtp({
          email: formik.values.email,
          otp: otpValue,
        })
      ).unwrap();

      setIsVerified(true);
      setError("");
    } catch (err) {
      // Error is handled by useEffect sync with reduxError
      console.error("Verification failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* Left Side: Illustration & Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-blue-500/5" />
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Briefcase size={14} />
            <span>Join our academy</span>
          </div>
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Empower the Next <span className="text-indigo-600">Generation</span> of Experts
          </h2>
          <p className="text-slate-600 text-lg mb-10">
            Create an instructor account and start sharing your knowledge with students from around the globe.
          </p>
          <img
            src="/instructor_illustration.png"
            alt="Instructor Illustration"
            className="w-full h-auto shadow-2xl rounded-3xl object-cover min-h-[400px]"
          />
        </div>
        {/* Abstract shapes */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      {/* Right Side: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header for Mobile */}
          <div className="lg:hidden mb-8 flex items-center justify-center">
            <img src="/logo.png" alt="Learnify" className="h-10 w-auto" />
          </div>

          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold">
                Instructor Account
              </span>
            </div>
            <h2 className="text-3xl font-extrabold mb-2">Apply to Teach</h2>
            <p className="text-slate-500">Become a part of our global teaching community.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center animate-shake">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-3 shrink-0" />
              {error}
            </div>
          )}

          {/* Stepper (Simplified) */}
          <div className="flex items-center space-x-2 mb-8 px-1">
            <div className={`h-1.5 flex-1 rounded-full ${isOtpSent ? 'bg-indigo-600' : 'bg-indigo-600'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${isVerified ? 'bg-indigo-600' : isOtpSent ? 'bg-indigo-200 animate-pulse' : 'bg-slate-200'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${isVerified ? 'bg-indigo-200 animate-pulse' : 'bg-slate-200'}`}></div>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* NAME */}
            <div className={`space-y-2 transition-all duration-300 ${isOtpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Prof. John Doe"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isOtpSent}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-slate-50 outline-none transition-all duration-200 ${
                    formik.touched.name && formik.errors.name
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-indigo-600 focus:bg-white"
                  }`}
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formik.errors.name}</p>
              )}
            </div>

            {/* EMAIL */}
            <div className={`space-y-2 transition-all duration-300 ${isOtpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-semibold text-slate-700 ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="instructor@learnify.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isOtpSent}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-slate-50 outline-none transition-all duration-200 ${
                    formik.touched.email && formik.errors.email
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-indigo-600 focus:bg-white"
                  }`}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formik.errors.email}</p>
              )}
            </div>

            {/* OTP Section */}
            {!isOtpSent ? (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span>{loading ? "Sending Code..." : "Verify Professional Email"}</span>
                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            ) : !isVerified && (
              <div className="space-y-5 animate-slideUp">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-slate-700">Verification Code</label>
                    <button type="button" onClick={() => setIsOtpSent(false)} className="text-indigo-600 text-xs font-bold hover:underline">Change Email</button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <ShieldCheck size={18} />
                    </div>
                    <input
                      type="text"
                      name="otp"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={formik.values.otp}
                      onChange={formik.handleChange}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 text-center tracking-[0.5em] font-bold text-xl transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? "Verifying..." : "Verify & Proceed"}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-xs text-slate-500">Resend code in <span className="font-bold">{timer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResendOtp} className="text-indigo-600 text-xs font-bold hover:underline">Resend Verification Code</button>
                  )}
                </div>
              </div>
            )}

            {/* Password Section (Only after verification) */}
            {isVerified && (
              <div className="space-y-5 animate-slideUp">
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-xs flex items-center mb-2 font-medium border border-green-100">
                  <CheckCircle2 size={16} className="mr-2" /> Professional email verified
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Set Secure Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Minimum 6 characters"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white transition-all"
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
                    <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formik.errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Repeat your password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formik.errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98]"
                >
                  Apply to Teach
                </button>
              </div>
            )}
          </form>

          <div className="text-center mt-10">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/instructor/login" className="text-indigo-600 font-bold hover:underline ml-1">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorRegister;
