export const getGoogleClientId = () =>
  String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

export const isGoogleAuthConfigured = () => Boolean(getGoogleClientId());

export const googleAuthNotConfiguredMessage =
  "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and rebuild the frontend.";
