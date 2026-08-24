// backend/controllers/uploadController.js

import cloudinary from "../config/cloudinary.js";

export const generateVideoUploadSignature = async (req, res) => {
  try {
    const { paramsToSign } = req.body;

    if (!paramsToSign) {
      return res.status(400).json({
        message: "Upload parameters are required",
      });
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not generate upload signature",
      error: error.message,
    });
  }
};