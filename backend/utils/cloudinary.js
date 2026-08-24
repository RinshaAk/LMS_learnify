import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = async (
  fileBuffer,
  folder,
  resourceType = "auto",
  filename = null
) => {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
    };

    if (filename) {
      const cleanName = filename.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );

      if (resourceType === "raw") {
        options.public_id = `${Date.now()}_${cleanName}`;
      } else if (filename.toLowerCase().endsWith(".pdf")) {
        const nameWithoutExt = cleanName.replace(/\.pdf$/i, "");

        options.public_id =
          `${Date.now()}_${nameWithoutExt}`;
      }
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

export const generateCloudinarySignature = (paramsToSign) => {
  if (!paramsToSign || typeof paramsToSign !== "object") {
    throw new Error("Invalid Cloudinary upload parameters");
  }

  return cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );
};