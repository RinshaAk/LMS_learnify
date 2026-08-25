import express from "express";
import {
  cancelLiveSession,
  createLiveSession,
  deleteLiveSession,
  endLiveSession,
  getBroadcastDetails,
  getLiveSessions,
  getLiveSessionStatus,
  getMyLiveSessions,
  startLiveSession,
  watchLiveSession,
} from "../controllers/liveController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("instructor"),
  createLiveSession
);

router.get(
  "/my-sessions",
  authMiddleware,
  roleMiddleware("instructor"),
  getMyLiveSessions
);

router.get(
  "/course/:courseId",
  authMiddleware,
  getLiveSessions
);

router.put(
  "/:id/start",
  authMiddleware,
  roleMiddleware("instructor"),
  startLiveSession
);

router.get(
  "/:id/status",
  authMiddleware,
  getLiveSessionStatus
);

router.get(
  "/:id/broadcast",
  authMiddleware,
  roleMiddleware("instructor"),
  getBroadcastDetails
);

router.get(
  "/:id/watch",
  authMiddleware,
  roleMiddleware("student"),
  watchLiveSession
);

router.put(
  "/:id/end",
  authMiddleware,
  roleMiddleware("instructor"),
  endLiveSession
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("instructor"),
  cancelLiveSession
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("instructor"),
  deleteLiveSession
);

export default router;
