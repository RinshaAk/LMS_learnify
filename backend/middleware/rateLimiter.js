import redisClient from "../config/redis.js";

const memoryBuckets = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

const incrementMemory = (key, windowMs) => {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { count: 1, ttlSeconds: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  return {
    count: existing.count,
    ttlSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
};

const incrementRedis = async (key, windowMs) => {
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.pExpire(key, windowMs);
  }

  const ttlMs = await redisClient.pTTL(key);
  return {
    count,
    ttlSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  };
};

export const createRateLimiter = ({
  name,
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  keyGenerator,
  skip,
}) => async (req, res, next) => {
  try {
    if (skip?.(req)) {
      return next();
    }

    const identity = keyGenerator
      ? keyGenerator(req)
      : req.user?.id || req.user?._id || getClientIp(req);
    const key = `rate:${name}:${identity}`;

    const result = redisClient.isReady
      ? await incrementRedis(key, windowMs)
      : incrementMemory(key, windowMs);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - result.count));
    res.setHeader("RateLimit-Reset", result.ttlSeconds);

    if (result.count > max) {
      console.warn("[RateLimit] blocked request", {
        policy: name,
        path: req.originalUrl,
        ip: getClientIp(req),
        userId: req.user?.id || req.user?._id,
      });

      return res.status(429).json({
        message,
        retryAfter: result.ttlSeconds,
      });
    }

    next();
  } catch (error) {
    console.error("[RateLimit] limiter failed open:", error.message);
    next();
  }
};

export const rateLimitPolicies = {
  general: createRateLimiter({
    name: "general",
    windowMs: Number(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_GENERAL_MAX || 600),
  }),
  auth: createRateLimiter({
    name: "auth",
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_AUTH_MAX || 40),
    message: "Too many authentication attempts. Please try again later.",
  }),
  password: createRateLimiter({
    name: "password",
    windowMs: Number(process.env.RATE_LIMIT_PASSWORD_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_PASSWORD_MAX || 10),
    message: "Too many password reset attempts. Please try again later.",
  }),
  chat: createRateLimiter({
    name: "chat",
    windowMs: Number(process.env.RATE_LIMIT_CHAT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.RATE_LIMIT_CHAT_MAX || 120),
    message: "Too many chat requests. Please slow down.",
  }),
  upload: createRateLimiter({
    name: "upload",
    windowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_UPLOAD_MAX || 60),
    message: "Too many upload requests. Please try again later.",
  }),
  admin: createRateLimiter({
    name: "admin",
    windowMs: Number(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_ADMIN_MAX || 300),
    message: "Too many admin requests. Please try again later.",
  }),
};
