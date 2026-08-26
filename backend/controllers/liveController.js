import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import {
  cancelLiveSessionService,
  createLiveSessionService,
  deleteLiveSessionService,
  endLiveSessionService,
  getBroadcastDetailsService,
  getLiveSessionsService,
  getLiveSessionStatusService,
  getMyLiveSessionsService,
  startLiveSessionService,
  watchLiveSessionService,
} from "../services/liveServices.js";

export const createLiveSession = asyncHandler(async (req, res) => {
  const session = await createLiveSessionService({
    ...req.body,
    instructor: req.user.id,
  });

  res.status(201).json({
    success: true,
    session,
  });
});

export const getLiveSessions = asyncHandler(async (req, res) => {
  const sessions = await getLiveSessionsService(req.params.courseId);

  res.json({
    success: true,
    count: sessions.length,
    sessions,
  });
});

export const getMyLiveSessions = asyncHandler(async (req, res) => {
  const sessions = await getMyLiveSessionsService(req.user.id);

  res.json({
    success: true,
    count: sessions.length,
    sessions,
  });
});

export const startLiveSession = asyncHandler(async (req, res) => {
  const result = await startLiveSessionService({
    sessionId: req.params.id,
    userId: req.user.id,
  });

  res.json({
    success: true,
    message: "Broadcast channel created. Add these details to OBS and start streaming.",
    ...result,
  });
});

export const getLiveSessionStatus = asyncHandler(async (req, res) => {
  const status = await getLiveSessionStatusService({
    sessionId: req.params.id,
  });

  res.json({
    success: true,
    ...status,
  });
});

export const getBroadcastDetails = asyncHandler(async (req, res) => {
  const broadcast = await getBroadcastDetailsService({
    sessionId: req.params.id,
    userId: req.user.id,
  });

  res.json({
    success: true,
    broadcast,
  });
});

export const watchLiveSession = asyncHandler(async (req, res) => {
  const result = await watchLiveSessionService({
    sessionId: req.params.id,
    userId: req.user.id,
    userRole: req.user.role,
  });

  res.json({
    success: true,
    ...result,
  });
});

export const endLiveSession = asyncHandler(async (req, res) => {
  const result = await endLiveSessionService({
    sessionId: req.params.id,
    userId: req.user.id,
  });

  const io = req.app.get("io");
  if (io) {
    io.to(`live:${req.params.id}`).emit("live:ended", {
      sessionId: req.params.id,
      endedAt: result.session?.endedAt,
    });
  }

  res.json({
    success: true,
    message: result.alreadyEnded
      ? "Live session has already ended"
      : "Live session ended successfully",
    session: result.session,
  });
});

export const cancelLiveSession = asyncHandler(async (req, res) => {
  const session = await cancelLiveSessionService({
    sessionId: req.params.id,
    userId: req.user.id,
    reason: req.body.reason,
  });

  res.json({
    success: true,
    message: "Live session cancelled",
    session,
  });
});

export const deleteLiveSession = asyncHandler(async (req, res) => {
  await deleteLiveSessionService(req.user.id, req.params.id);

  res.json({
    success: true,
    message: "Live session deleted successfully",
  });
});
