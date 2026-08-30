import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import mongoose from "mongoose";

import { initializeSocket } from "./sockets/chatSocket.js";

import { env } from "./config/env.config.js";
import connectDB from "./config/db.js";

import {
  connectRedis,
  disconnectRedis,
} from "./config/redis.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import liveRoutes from "./routes/liveRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import missionRoutes from "./routes/missionRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

// Middleware
import errorMiddleware from "./middleware/errorMiddleware.js";
import { rateLimitPolicies } from "./middleware/rateLimiter.js";
import {
  requestLogger,
  requestTimeout,
  securityHeaders,
} from "./middleware/productionMiddleware.js";

const app = express();
const httpServer = createServer(app);

httpServer.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 35000);
httpServer.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 40000);
httpServer.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 10000);

const io = initializeSocket(httpServer);
app.set("io", io);

// ================= MIDDLEWARE =================

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(requestLogger);
app.use(requestTimeout());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || "1mb" }));

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);

app.get("/health", (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = Boolean(req.app.get("redisReady") ?? true);

  res.status(mongoReady && redisReady ? 200 : 503).json({
    status: mongoReady && redisReady ? "ok" : "degraded",
    mongo: mongoReady ? "ok" : "unavailable",
    redis: redisReady ? "ok" : "unavailable",
    uptime: process.uptime(),
  });
});

// ================= ROUTES =================

app.use("/api", rateLimitPolicies.general);
app.use("/api/auth", rateLimitPolicies.auth, authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", rateLimitPolicies.admin, adminRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/chat", rateLimitPolicies.chat, chatRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/progress", progressRoutes);

app.use(
  "/api/certificates",
  certificateRoutes
);

app.use("/api/payments", paymentRoutes);
app.use("/api/video", rateLimitPolicies.upload, videoRoutes);
app.use("/api/uploads", rateLimitPolicies.upload, uploadRoutes);
app.use("/api/missions", missionRoutes);

app.use(
  "/api/notifications",
  notificationRoutes
);

// Error middleware must remain after routes.
app.use(errorMiddleware);

const PORT = env.PORT || 5000;

let isShuttingDown = false;

const listenOnPort = () =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      httpServer.off("listening", onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off("error", onError);
      resolve();
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);

    httpServer.listen(PORT);
  });

// ================= START SERVER =================

const startServer = async () => {
  try {
    await connectDB(env.MONGO_URL);
    await connectRedis();
    app.set("redisReady", true);

    await listenOnPort();

    console.log(
      `Server running on port ${PORT}`
    );
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other server or set a different PORT in backend/.env.`
      );
    }

    console.error(
      "Server startup failed:",
      error.message
    );

    await Promise.allSettled([
      mongoose.connection.close(),
      disconnectRedis(),
    ]);

    process.exit(1);
  }
};

// ================= GRACEFUL SHUTDOWN =================

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Shutting down...`
  );

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000));

  forceExit.unref();

  io.close(() => {
    httpServer.close(async () => {
      try {
        await Promise.allSettled([
          mongoose.connection.close(false),
          disconnectRedis(),
        ]);

        console.log(
          "HTTP, Socket.IO, MongoDB and Redis connections closed"
        );

        clearTimeout(forceExit);
        process.exit(0);
      } catch (error) {
        console.error(
          "Shutdown failed:",
          error.message
        );

        clearTimeout(forceExit);
        process.exit(1);
      }
    });
  });
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

startServer();
