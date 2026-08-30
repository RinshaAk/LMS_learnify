import express from "express";
import multer from "multer";
import path from "path";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import {
  uploadToCloudinary,
  generateCloudinarySignature,
} from "../utils/cloudinary.js";
import {
  createPresignedVideoPlayback,
  createPresignedVideoUpload,
  PDF_MIME_TYPE,
  uploadPdfToS3,
} from "../utils/s3Uploads.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();

const allowedTypes = {
  image: {
    maxSize: 5 * 1024 * 1024,
    mimes: new Set(["image/jpeg", "image/png", "image/webp"]),
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },
  resource: {
    maxSize: 25 * 1024 * 1024,
    mimes: new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip",
      "text/plain",
    ]),
    extensions: new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".zip", ".txt"]),
  },
};

const createUpload = ({ maxSize, mimes, extensions }) =>
  multer({
    storage,
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();

      if (!mimes.has(file.mimetype) || !extensions.has(ext)) {
        return cb(new Error("Unsupported file type"));
      }

      cb(null, true);
    },
  });

const imageUpload = createUpload(allowedTypes.image);
const resourceUpload = createUpload(allowedTypes.resource);

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
    const error = new Error("Not authorized to upload for this course");
    error.statusCode = 403;
    throw error;
  }
};

const getAuthorizedPlaybackUrl = async ({ courseId, lessonId, videoUrl, user }) => {
  const lesson = lessonId
    ? await Lesson.findById(lessonId)
    : await Lesson.findOne({ videoUrl });

  if (!lesson) {
    const error = new Error("Lesson video not found");
    error.statusCode = 404;
    throw error;
  }

  if (courseId && lesson.courseId.toString() !== courseId.toString()) {
    const error = new Error("Lesson does not belong to this course");
    error.statusCode = 400;
    throw error;
  }

  if (videoUrl && lesson.videoUrl !== videoUrl) {
    const error = new Error("Video URL does not match this lesson");
    error.statusCode = 400;
    throw error;
  }

  const course = await Course.findById(lesson.courseId).select(
    "instructor status approvalStatus isHidden isBlocked"
  );

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const isAdmin = user.role === "admin";
  const isOwner = user.role === "instructor" && course.instructor?.toString() === user.id?.toString();
  const isEnrolled = user.role === "student"
    ? await Enrollment.exists({ user: user.id, course: lesson.courseId })
    : false;
  const canPreviewFreeLesson =
    lesson.isPreviewFree &&
    course.status === "published" &&
    course.approvalStatus === "approved" &&
    !course.isHidden &&
    !course.isBlocked;

  if (!isAdmin && !isOwner && !isEnrolled && !canPreviewFreeLesson) {
    const error = new Error("Not authorized to preview this video");
    error.statusCode = 403;
    throw error;
  }

  if (!lesson.videoUrl) {
    const error = new Error("No video available for this lesson");
    error.statusCode = 404;
    throw error;
  }

  return lesson.videoUrl;
};

// Upload thumbnail
router.post(
  "/thumbnail",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  imageUpload.single("thumbnail"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        "learnify/thumbnails",
        "image"
      );

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error("Thumbnail Upload Error:", error.message);

      return res.status(500).json({
        message: "Upload failed",
      });
    }
  }
);

// Upload profile picture
router.post(
  "/profile-picture",
  authMiddleware,
  imageUpload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        "learnify/profiles",
        "image"
      );

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error("Profile Picture Upload Error:", error.message);

      return res.status(500).json({
        message: "Upload failed",
      });
    }
  }
);

router.post(
  "/video/presign",
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

      return res.status(200).json({
        success: true,
        ...upload,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/video", authMiddleware, roleMiddleware("instructor", "admin"), (req, res) => {
  res.status(410).json({
    success: false,
    message: "Direct backend video uploads are disabled. Use /api/uploads/video/presign for S3 direct uploads.",
  });
});

router.post(
  "/video/playback-url",
  authMiddleware,
  roleMiddleware("admin", "instructor", "student"),
  async (req, res, next) => {
    try {
      const { courseId, lessonId, videoUrl } = req.body;
      const authorizedVideoUrl = await getAuthorizedPlaybackUrl({
        courseId,
        lessonId,
        videoUrl,
        user: req.user,
      });

      if (/^https?:\/\//i.test(authorizedVideoUrl) && !authorizedVideoUrl.includes(".amazonaws.com/")) {
        return res.status(200).json({
          success: true,
          url: authorizedVideoUrl,
          expiresIn: null,
        });
      }

      const playback = await createPresignedVideoPlayback(authorizedVideoUrl);

      return res.status(200).json({
        success: true,
        ...playback,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate signed authorization for legacy Cloudinary clients.
router.post(
  "/video-signature",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res) => {
    try {
      const { paramsToSign } = req.body;

      if (!paramsToSign || typeof paramsToSign !== "object") {
        return res.status(400).json({
          message: "Upload parameters are required",
        });
      }

      if (
        paramsToSign.folder &&
        paramsToSign.folder !== "learnify/videos"
      ) {
        return res.status(400).json({
          message: "Invalid upload folder",
        });
      }

      const signature =
        generateCloudinarySignature(paramsToSign);

      return res.status(200).json({
        success: true,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      });
    } catch (error) {
      console.error("Video Signature Error:", error.message);

      return res.status(500).json({
        message: "Could not authorize video upload",
      });
    }
  }
);

// Upload assessment resources and assignment attachments
router.post(
  "/resource",
  authMiddleware,
  roleMiddleware("instructor", "student"),
  resourceUpload.single("resource"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      if (req.file.mimetype === PDF_MIME_TYPE) {
        const { courseId } = req.body;

        if (!courseId) {
          return res.status(400).json({ message: "courseId is required for PDF uploads" });
        }

        await canUploadToCourse({ courseId, user: req.user });

        const result = await uploadPdfToS3({
          fileBuffer: req.file.buffer,
          courseId,
          userId: req.user.id,
          fileName: req.file.originalname,
          contentType: req.file.mimetype,
          fileSize: req.file.size,
        });

        return res.status(200).json({
          success: true,
          key: result.key,
          url: result.key,
          storage: "s3",
        });
      }

      const resourceType = "raw";

      const result = await uploadToCloudinary(
        req.file.buffer,
        "learnify/resources",
        resourceType,
        req.file.originalname
      );

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error("Resource Upload Error:", error.message);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : "Resource upload failed",
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ message: error.message });
  }

  if (error.message === "Unsupported file type") {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});

export default router;
