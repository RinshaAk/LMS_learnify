export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  next();
};

export const requestTimeout = (timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 30000)) => (
  req,
  res,
  next
) => {
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: "Request timed out" });
    }
  });
  next();
};

export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (res.statusCode >= 500 || durationMs > Number(process.env.SLOW_REQUEST_MS || 1500)) {
      console.warn("[Request]", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    }
  });

  next();
};
