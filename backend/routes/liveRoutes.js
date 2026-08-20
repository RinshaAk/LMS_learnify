import express from "express";
import {
  createLiveSession,
  getLiveSessions,
  startLiveSession,
  endLiveSession,
  getMyLiveSessions,
  deleteLiveSession,
} from "../controllers/liveController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";


const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("instructor"), createLiveSession);
router.get("/my-sessions", authMiddleware, getMyLiveSessions);
router.get("/:courseId", getLiveSessions);

router.put("/:id/start", authMiddleware, roleMiddleware("instructor"), startLiveSession);
router.put("/:id/end", authMiddleware, roleMiddleware("instructor"), endLiveSession);
router.delete("/:id", authMiddleware, roleMiddleware("instructor"), deleteLiveSession);

export default router;
