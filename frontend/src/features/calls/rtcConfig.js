const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getRtcIceServers = () => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = splitCsv(import.meta.env.VITE_TURN_URLS);
  const turnUsername = String(import.meta.env.VITE_TURN_USERNAME || "").trim();
  const turnCredential = String(import.meta.env.VITE_TURN_CREDENTIAL || "").trim();

  if (turnUrls.length > 0) {
    const turnServer = { urls: turnUrls };

    if (turnUsername && turnCredential) {
      turnServer.username = turnUsername;
      turnServer.credential = turnCredential;
    }

    iceServers.push(turnServer);
  }

  return iceServers;
};
