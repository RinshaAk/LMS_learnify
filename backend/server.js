import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initializeSocket } from "./sockets/chatSocket.js";

import { env } from "./config/env.config.js";
import connectDB from "./config/db.js";
//routes
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import userRoutes from "./routes/userRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import instructorRoutes from "./routes/instructorRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"
import liveRoutes from "./routes/liveRoutes.js"
import examRoutes from "./routes/examRoutes.js"
import progressRoutes from "./routes/progressRoutes.js"
import certificateRoutes from "./routes/certificateRoutes.js"
import videoRoutes from "./routes/videoRoutes.js"
import uploadRoutes from "./routes/uploadRoutes.js"
import missionRoutes from "./routes/missionRoutes.js"
import studentRoutes from "./routes/studentRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
import path from "path";

//middleware
import errorMiddleware from "./middleware/errorMiddleware.js"
import paymentRoutes from "./routes/paymentRoutes.js";

connectDB(env.MONGO_URL);

const app = express();
const httpServer = createServer(app);
initializeSocket(httpServer);

app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true
}))
app.use(express.json())
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instructor",instructorRoutes)
app.use("/api/student", studentRoutes);
app.use("/api/chat",chatRoutes)
app.use("/api/live",liveRoutes)
app.use("/api/exams", examRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/certificates", certificateRoutes)
app.use("/api/payments",paymentRoutes)
app.use("/api/video", videoRoutes)
app.use("/api/uploads", uploadRoutes)
app.use("/api/missions", missionRoutes)
app.use("/api/notifications", notificationRoutes);
app.use(errorMiddleware);

const PORT = env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
