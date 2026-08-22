import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Lock } from "lucide-react";
import { resetPasswordAPI } from "../../features/auth/authAPI";

const loginPaths = {
  student: "/login",
  instructor: "/instructor/login",
  admin: "/admin/login",
};

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const portal = useMemo(() => {
    const value = searchParams.get("portal");
    return Object.keys(loginPaths).includes(value) ? value : "student";
  }, [searchParams]);

  const loginPath = loginPaths[portal];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");

    if (!token) {
      setApiError("Password reset token is missing.");
      return;
    }

    if (password.length < 8) {
      setApiError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setApiError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordAPI({
        token,
        password,
        confirmPassword,
      });

      toast.success(result.message);
      navigate(loginPath, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "The reset link is invalid or expired.";

      setApiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
          <Lock size={22} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Create New Password
        </h1>

        <p className="text-slate-500 mt-2 mb-6">
          Enter and confirm your new password. Reset links expire after 15
          minutes.
        </p>

        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 p-4 mb-5 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              New password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Confirm new password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            to={loginPath}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
