export const getRazorpayKeyId = () =>
  String(import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();

export const isRazorpayConfigured = () => Boolean(getRazorpayKeyId());

export const razorpayNotConfiguredMessage =
  "Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID and rebuild the frontend.";
