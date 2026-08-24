import express from "express";
import multer from "multer";
import {
  uploadToCloudinary,
  generateCloudinarySignature,
} from "../utils/cloudinary.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Multer is used only for small files
const storage = multer.memoryStorage();

const createUpload = ({ fileSize, allowedMimeTypes }) =>
  multer({
    storage,
    limits: { fileSize },
    fileFilter: (req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Unsupported file type"));
      }

      cb(null, true);
    },
  });

const imageUpload = createUpload({
  fileSize: 5 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
});

const videoUpload = createUpload({
  fileSize: 250 * 1024 * 1024,
  allowedMimeTypes: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
});

const resourceUpload = createUpload({
  fileSize: 25 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/zip",
    "text/plain",
  ],
});

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
      console.error("Thumbnail Upload Error:", error);

      return res.status(500).json({
        message: "Upload failed",
        error: error.message,
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
      console.error("Profile Picture Upload Error:", error);

      return res.status(500).json({
        message: "Upload failed",
        error: error.message,
      });
    }
  }
);

// Upload video
router.post(
  "/video",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  videoUpload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No video file uploaded",
        });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        "learnify/videos",
        "video",
        req.file.originalname
      );

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error("Video Upload Error:", error);

      return res.status(500).json({
        message: "Video upload failed",
        error: error.message,
      });
    }
  }
);

// Generate signed authorization for large-video uploads
router.post(
  "/video-signature",
  authMiddleware,
  roleMiddleware("instructor"),
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
      console.error("Video Signature Error:", error);

      return res.status(500).json({
        message: "Could not authorize video upload",
        error: error.message,
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

      const isPdf = req.file.originalname
        ?.toLowerCase()
        .endsWith(".pdf");

      const resourceType = isPdf ? "image" : "raw";

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
      console.error("Resource Upload Error:", error);

      return res.status(500).json({
        message: "Resource upload failed",
        error: error.message,
      });
    }
  }
);

// Handle Multer errors
router.use((error, req, res, next) => {
  if (
    error instanceof multer.MulterError ||
    error.message === "Unsupported file type"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  next(error);
});

export default router;
