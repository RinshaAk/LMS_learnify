import express from "express";
import multer from "multer";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Multer in-memory storage
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
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});

const videoUpload = createUpload({
  fileSize: 250 * 1024 * 1024,
  allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
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

// Upload Thumbnail (Image)
router.post("/thumbnail", authMiddleware, roleMiddleware("instructor", "admin"), imageUpload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "learnify/thumbnails", "image");

    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Thumbnail Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// Upload Profile Picture
router.post("/profile-picture", authMiddleware, imageUpload.single("profilePicture"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "learnify/profiles", "image");

    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Profile Picture Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// Upload Video
router.post("/video", authMiddleware, roleMiddleware("instructor"), videoUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "learnify/videos", "video");

    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Video Upload Error:", error);
    res.status(500).json({ message: "Video upload failed", error: error.message });
  }
});

// Upload assessment resources and assignment attachments
router.post("/resource", authMiddleware, roleMiddleware("instructor", "student"), resourceUpload.single("resource"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isPdf = req.file.originalname?.toLowerCase().endsWith(".pdf");
    const resourceType = isPdf ? "image" : "raw";

    const result = await uploadToCloudinary(
      req.file.buffer,
      "learnify/resources",
      resourceType,
      req.file.originalname
    );

    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Resource Upload Error:", error);
    res.status(500).json({ message: "Resource upload failed", error: error.message });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === "Unsupported file type") {
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

export default router;
