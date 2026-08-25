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

const app = express();
const httpServer = createServer(app);

const io = initializeSocket(httpServer);
app.set("io", io);

// ================= MIDDLEWARE =================

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);

// ================= ROUTES =================

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/progress", progressRoutes);

app.use(
  "/api/certificates",
  certificateRoutes
);

app.use("/api/payments", paymentRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/missions", missionRoutes);

app.use(
  "/api/notifications",
  notificationRoutes
);

// Error middleware must remain after routes.
app.use(errorMiddleware);

const PORT = env.PORT || 5000;

let isShuttingDown = false;

// ================= START SERVER =================

const startServer = async () => {
  try {
    // Express starts only after both services connect.
    await connectDB(env.MONGO_URL);
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  } catch (error) {
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

  httpServer.close(async () => {
    try {
      await Promise.all([
        mongoose.connection.close(),
        disconnectRedis(),
      ]);

      console.log(
        "MongoDB and Redis connections closed"
      );

      process.exit(0);
    } catch (error) {
      console.error(
        "Shutdown failed:",
        error.message
      );

      process.exit(1);
    }
  });
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

startServer();
