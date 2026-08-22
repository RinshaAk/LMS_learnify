import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Mail } from "lucide-react";
import { forgotPasswordAPI } from "../../features/auth/authAPI";

const loginPaths = {
  student: "/login",
  instructor: "/instructor/login",
  admin: "/admin/login",
};

function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [message, setMessage] = useState("");

  const portal = useMemo(() => {
    const value = searchParams.get("portal");
    return Object.keys(loginPaths).includes(value) ? value : "student";
  }, [searchParams]);

  const loginPath = loginPaths[portal];

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPasswordAPI({
        email: normalizedEmail,
        portal,
      });

      setMessage(
        result.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
      setEmailSent(true);
      toast.success("Reset instructions sent");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
          <Mail size={22} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Forgot Password
        </h1>

        <p className="text-slate-500 mt-2 mb-6">
          Enter your registered email address and we'll send you a password
          reset link.
        </p>

        {emailSent ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-700 text-sm leading-6">
              <p>{message}</p>
              <p className="mt-2">
                Please check your inbox and spam folder.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setMessage("");
              }}
              className="w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-3 rounded-xl font-semibold transition-colors"
            >
              Send Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

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

export default ForgotPassword;
