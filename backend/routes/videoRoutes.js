import express from "express";
import Course from "../models/Course.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { createPresignedVideoUpload } from "../utils/s3Uploads.js";
import { saveVideoProgress, getVideoProgress } from "../controllers/videoController.js";

const router = express.Router();

const canUploadToCourse = async ({ courseId, user }) => {
  const course = await Course.findById(courseId).select("instructor");

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const isAdmin = user.role === "admin";
  const isOwner = course.instructor?.toString() === user.id?.toString();

  if (!isAdmin && !isOwner) {
    const error = new Error("Not authorized to upload video for this course");
    error.statusCode = 403;
    throw error;
  }
};

router.post(
  "/presigned-upload",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res, next) => {
    try {
      const { courseId, fileName, contentType, fileSize } = req.body;

      if (!courseId) {
        return res.status(400).json({ message: "courseId is required" });
      }

      await canUploadToCourse({ courseId, user: req.user });

      const upload = await createPresignedVideoUpload({
        courseId,
        userId: req.user.id,
        fileName,
        contentType,
        fileSize,
      });

      res.status(200).json({
        success: true,
        ...upload,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/upload-video", authMiddleware, roleMiddleware("instructor", "admin"), (req, res) => {
  res.status(410).json({
    success: false,
    message: "Direct backend video uploads are disabled. Use the presigned S3 upload endpoint.",
  });
});

// Progress tracking routes
router.post("/save-progress", authMiddleware, saveVideoProgress);
router.get("/progress/:lessonId", authMiddleware, getVideoProgress);

export default router;
