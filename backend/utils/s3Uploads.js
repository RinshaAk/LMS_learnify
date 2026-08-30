import crypto from "crypto";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const EXTENSION_BY_MIME = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export const PDF_MIME_TYPE = "application/pdf";

const getMaxVideoSize = () => Number(process.env.MAX_VIDEO_UPLOAD_BYTES || 1024 * 1024 * 1024);
const getMaxPdfSize = () => Number(process.env.MAX_PDF_UPLOAD_BYTES || 25 * 1024 * 1024);

const requireS3Config = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!region || !bucket) {
    const error = new Error("S3 upload is not configured");
    error.statusCode = 503;
    throw error;
  }

  return { region, bucket };
};

const s3ClientCache = new Map();

const getS3Client = (region) => {
  if (!s3ClientCache.has(region)) {
    s3ClientCache.set(region, new S3Client({ region }));
  }

  return s3ClientCache.get(region);
};

const safeName = (filename = "file") => path
  .basename(filename, path.extname(filename))
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);

const extractObjectKey = (urlOrKey, label = "Object key") => {
  if (!urlOrKey || typeof urlOrKey !== "string") {
    const error = new Error(`${label} is required`);
    error.statusCode = 400;
    throw error;
  }

  if (!/^https?:\/\//i.test(urlOrKey)) {
    return urlOrKey.replace(/^\/+/, "");
  }

  const parsedUrl = new URL(urlOrKey);
  return decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
};

export const validateVideoUploadRequest = ({ fileName, contentType, fileSize }) => {
  if (!fileName || typeof fileName !== "string") {
    const error = new Error("File name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!VIDEO_MIME_TYPES.has(contentType)) {
    const error = new Error("Unsupported video type");
    error.statusCode = 400;
    throw error;
  }

  const size = Number(fileSize);
  if (!Number.isFinite(size) || size <= 0) {
    const error = new Error("Valid file size is required");
    error.statusCode = 400;
    throw error;
  }

  if (size > getMaxVideoSize()) {
    const error = new Error("Video file is too large");
    error.statusCode = 413;
    throw error;
  }
};

export const createVideoObjectKey = ({ courseId, userId, fileName, contentType }) => {
  const extension = EXTENSION_BY_MIME[contentType] || path.extname(fileName).toLowerCase();
  const id = crypto.randomUUID();
  const name = safeName(fileName) || "video";
  return `courses/${courseId}/videos/${userId}/${Date.now()}-${id}-${name}${extension}`;
};

export const validatePdfUpload = ({ fileName, contentType, fileSize }) => {
  if (!fileName || typeof fileName !== "string") {
    const error = new Error("PDF file name is required");
    error.statusCode = 400;
    throw error;
  }

  if (contentType !== PDF_MIME_TYPE || path.extname(fileName).toLowerCase() !== ".pdf") {
    const error = new Error("Only PDF files are allowed");
    error.statusCode = 400;
    throw error;
  }

  const size = Number(fileSize);
  if (!Number.isFinite(size) || size <= 0) {
    const error = new Error("Valid PDF file size is required");
    error.statusCode = 400;
    throw error;
  }

  if (size > getMaxPdfSize()) {
    const error = new Error("PDF file is too large");
    error.statusCode = 413;
    throw error;
  }
};

export const createPdfObjectKey = ({ courseId, fileName }) => {
  const id = crypto.randomUUID();
  const name = safeName(fileName) || "reference";
  return `pdfs/${courseId}/${Date.now()}-${id}-${name}.pdf`;
};

export const uploadPdfToS3 = async ({ fileBuffer, courseId, userId, fileName, contentType, fileSize }) => {
  validatePdfUpload({ fileName, contentType, fileSize });

  const { region, bucket } = requireS3Config();
  const key = createPdfObjectKey({ courseId, fileName });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: PDF_MIME_TYPE,
    ContentDisposition: `inline; filename="${path.basename(fileName).replace(/"/g, "")}"`,
    Metadata: {
      courseId: String(courseId),
      uploadedBy: String(userId),
    },
  });

  await getS3Client(region).send(command);

  return { key };
};

export const createPresignedVideoUpload = async ({ courseId, userId, fileName, contentType, fileSize }) => {
  validateVideoUploadRequest({ fileName, contentType, fileSize });

  const { region, bucket } = requireS3Config();
  const key = createVideoObjectKey({ courseId, userId, fileName, contentType });
  const expiresIn = Number(process.env.S3_PRESIGNED_URL_TTL_SECONDS || 900);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: Number(fileSize),
    Metadata: {
      courseId: String(courseId),
      uploadedBy: String(userId),
    },
  });

  const uploadUrl = await getSignedUrl(getS3Client(region), command, { expiresIn });
  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    uploadUrl,
    key,
    url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    headers: {
      "Content-Type": contentType,
    },
    expiresIn,
  };
};

export const createPresignedVideoPlayback = async (videoUrlOrKey) => {
  const key = extractObjectKey(videoUrlOrKey, "Video URL");

  if (!key.startsWith("courses/")) {
    const error = new Error("Invalid video object key");
    error.statusCode = 400;
    throw error;
  }

  const { region, bucket } = requireS3Config();
  const expiresIn = Number(process.env.S3_PLAYBACK_URL_TTL_SECONDS || 900);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return {
    url: await getSignedUrl(getS3Client(region), command, { expiresIn }),
    expiresIn,
  };
};

export const createPresignedPdfUrl = async (pdfKey) => {
  const key = extractObjectKey(pdfKey, "PDF key");

  if (!key.startsWith("pdfs/") || !key.toLowerCase().endsWith(".pdf")) {
    const error = new Error("Invalid PDF object key");
    error.statusCode = 400;
    throw error;
  }

  const { region, bucket } = requireS3Config();
  const expiresIn = Number(process.env.S3_PDF_URL_TTL_SECONDS || 3600);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: PDF_MIME_TYPE,
    ResponseContentDisposition: "inline",
  });

  return {
    url: await getSignedUrl(getS3Client(region), command, { expiresIn }),
    expiresIn,
  };
};

export const deletePdfFromS3 = async (pdfKey) => {
  const key = extractObjectKey(pdfKey, "PDF key");

  if (!key.startsWith("pdfs/") || !key.toLowerCase().endsWith(".pdf")) {
    return false;
  }

  const { region, bucket } = requireS3Config();
  await getS3Client(region).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return true;
};
