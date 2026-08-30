import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";
import {
  createPresignedVideoPlayback,
  createVideoObjectKey,
  validateVideoUploadRequest,
} from "../utils/s3Uploads.js";

test("pagination applies defaults and computes metadata", () => {
  const pagination = getPagination({}, { defaultLimit: 20, maxLimit: 50 });

  assert.deepEqual(pagination, { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(buildPaginationMeta({ page: 1, limit: 20, total: 45 }), {
    page: 1,
    limit: 20,
    total: 45,
    totalPages: 3,
    hasNextPage: true,
    hasPrevPage: false,
  });
});

test("pagination caps huge limits and normalizes invalid pages", () => {
  const pagination = getPagination(
    { page: "bad", limit: "999999" },
    { defaultLimit: 25, maxLimit: 100 }
  );

  assert.equal(pagination.page, 1);
  assert.equal(pagination.limit, 100);
  assert.equal(pagination.skip, 0);
});

test("video upload validation accepts supported video within size", () => {
  assert.doesNotThrow(() => validateVideoUploadRequest({
    fileName: "lesson.mp4",
    contentType: "video/mp4",
    fileSize: 1024,
  }));
});

test("video upload validation rejects unsupported MIME types", () => {
  assert.throws(() => validateVideoUploadRequest({
    fileName: "lesson.exe",
    contentType: "application/x-msdownload",
    fileSize: 1024,
  }), /Unsupported video type/);
});

test("video upload validation rejects oversized videos", () => {
  const previous = process.env.MAX_VIDEO_UPLOAD_BYTES;
  process.env.MAX_VIDEO_UPLOAD_BYTES = "100";

  assert.throws(() => validateVideoUploadRequest({
    fileName: "lesson.mp4",
    contentType: "video/mp4",
    fileSize: 101,
  }), /too large/);

  if (previous === undefined) {
    delete process.env.MAX_VIDEO_UPLOAD_BYTES;
  } else {
    process.env.MAX_VIDEO_UPLOAD_BYTES = previous;
  }
});

test("video object keys are scoped and sanitize filenames", () => {
  const key = createVideoObjectKey({
    courseId: "course123",
    userId: "user456",
    fileName: "../My Lesson!.mp4",
    contentType: "video/mp4",
  });

  assert.match(key, /^courses\/course123\/videos\/user456\/\d+-[a-f0-9-]+-My-Lesson\.mp4$/);
  assert.equal(key.includes(".."), false);
});

test("video playback signing rejects unscoped keys", async () => {
  await assert.rejects(
    () => createPresignedVideoPlayback("avatars/user.mp4"),
    /Invalid video object key/
  );
});

import { createRateLimiter } from "../middleware/rateLimiter.js";

const invokeLimiter = async (limiter, reqOverrides = {}) => {
  const result = { headers: {}, statusCode: 200, body: null, nextCalled: false };
  const req = {
    ip: "127.0.0.1",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    originalUrl: "/test",
    ...reqOverrides,
  };
  const res = {
    setHeader: (key, value) => {
      result.headers[key] = value;
    },
    status: (code) => {
      result.statusCode = code;
      return res;
    },
    json: (body) => {
      result.body = body;
      return res;
    },
  };

  await limiter(req, res, () => {
    result.nextCalled = true;
  });

  return result;
};

test("rate limiter allows requests under the limit", async () => {
  const limiter = createRateLimiter({
    name: `test-ok-${Date.now()}`,
    windowMs: 60000,
    max: 2,
    keyGenerator: () => "user-a",
  });

  const result = await invokeLimiter(limiter);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers["RateLimit-Limit"], 2);
});

test("rate limiter returns 429 after the limit is exceeded", async () => {
  const limiter = createRateLimiter({
    name: `test-block-${Date.now()}`,
    windowMs: 60000,
    max: 1,
    keyGenerator: () => "user-b",
  });

  await invokeLimiter(limiter);
  const result = await invokeLimiter(limiter);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 429);
  assert.match(result.body.message, /Too many requests/);
});
