import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import User from "../models/User.js";

let io;
const userSocketMap = new Map(); // userId -> Set<socketId>

const normalizeId = (id) => id?.toString();

const addUserSocket = (userId, socketId) => {
  const key = normalizeId(userId);
  if (!key) return false;

  const wasOffline = !userSocketMap.has(key);
  const sockets = userSocketMap.get(key) || new Set();
  sockets.add(socketId);
  userSocketMap.set(key, sockets);
  return wasOffline;
};

const removeUserSocket = (userId, socketId) => {
  const key = normalizeId(userId);
  if (!key) return false;

  const sockets = userSocketMap.get(key);
  if (!sockets) return false;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSocketMap.delete(key);
    return true;
  }

  return false;
};

const getUserSocketIds = (userId) => {
  const key = normalizeId(userId);
  return key ? Array.from(userSocketMap.get(key) || []) : [];
};

const emitOnlineUsers = () => {
  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
};

const emitToUser = (userId, event, payload) => {
  const socketIds = getUserSocketIds(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
  return socketIds.length > 0;
};

const isSafeString = (value, maxLength = 160) => (
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength
);

const createSocketLimiter = ({ max, windowMs }) => {
  const buckets = new Map();

  return (socket, eventName) => {
    const now = Date.now();
    const key = `${socket.id}:${eventName}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;
    return bucket.count <= max;
  };
};

const signalingLimiter = createSocketLimiter({
  max: Number(process.env.SOCKET_SIGNAL_MAX_PER_WINDOW || 80),
  windowMs: Number(process.env.SOCKET_SIGNAL_WINDOW_MS || 10000),
});

const iceLimiter = createSocketLimiter({
  max: Number(process.env.SOCKET_ICE_MAX_PER_WINDOW || 200),
  windowMs: Number(process.env.SOCKET_ICE_WINDOW_MS || 10000),
});

const guardSocketEvent = (socket, eventName, limiter = signalingLimiter) => {
  if (limiter(socket, eventName)) {
    return true;
  }

  socket.emit("call-error", {
    message: "Too many realtime events. Please slow down.",
  });
  return false;
};

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id name isBlocked role").lean();

      if (!user || user.isBlocked) {
        return next(new Error("Authentication failed"));
      }

      socket.userId = user._id.toString();
      socket.data.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      };
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    const becameOnline = addUserSocket(userId, socket.id);

    if (becameOnline) {
      emitOnlineUsers();
    }

    socket.on("join-room", (roomId) => {
      if (!guardSocketEvent(socket, "join-room") || !isSafeString(roomId)) {
        return;
      }

      socket.join(roomId);
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (clientsInRoom && clientsInRoom.size > 1) {
        socket.emit("other-user-exists");
      }
    });

    socket.on("offer", ({ roomId, offer } = {}) => {
      if (!guardSocketEvent(socket, "offer") || !isSafeString(roomId) || !offer) {
        return;
      }
      socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer } = {}) => {
      if (!guardSocketEvent(socket, "answer") || !isSafeString(roomId) || !answer) {
        return;
      }
      socket.to(roomId).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ roomId, candidate } = {}) => {
      if (!guardSocketEvent(socket, "ice-candidate", iceLimiter) || !isSafeString(roomId) || !candidate) {
        return;
      }
      socket.to(roomId).emit("ice-candidate", candidate);
    });

    socket.on("call-user", ({ userToCall, callerName, callerAvatar, roomId, callId } = {}) => {
      if (!guardSocketEvent(socket, "call-user")) return;

      const targetUserId = normalizeId(userToCall);
      if (!targetUserId || !isSafeString(roomId) || !isSafeString(callId)) {
        socket.emit("call-error", { callId, message: "Invalid call request" });
        return;
      }

      if (targetUserId === userId) {
        socket.emit("call-error", { callId, message: "You cannot call yourself" });
        return;
      }

      const delivered = emitToUser(targetUserId, "incoming-call", {
        from: userId,
        callerId: userId,
        callerName: callerName || socket.data.user?.name || "User",
        callerAvatar: callerAvatar || "",
        roomId,
        callId,
      });

      if (!delivered) {
        socket.emit("call-unavailable", {
          callId,
          to: targetUserId,
          message: "User is offline",
        });
      }
    });

    socket.on("accept-call", ({ to, callId, roomId } = {}) => {
      if (!guardSocketEvent(socket, "accept-call")) return;

      const targetUserId = normalizeId(to);
      if (!targetUserId || !isSafeString(callId)) {
        socket.emit("call-error", { callId, message: "Invalid accept call request" });
        return;
      }

      emitToUser(targetUserId, "call-accepted", {
        from: userId,
        accepterId: userId,
        callId,
        roomId,
      });
    });

    socket.on("reject-call", ({ to, callId } = {}) => {
      if (!guardSocketEvent(socket, "reject-call")) return;

      const targetUserId = normalizeId(to);
      if (!targetUserId || !isSafeString(callId)) {
        socket.emit("call-error", { callId, message: "Invalid reject call request" });
        return;
      }

      emitToUser(targetUserId, "call-rejected", {
        from: userId,
        rejecterId: userId,
        callId,
      });
    });

    socket.on("end-call", ({ to, roomId, callId } = {}) => {
      if (!guardSocketEvent(socket, "end-call")) return;

      const targetUserId = normalizeId(to);
      if (targetUserId) {
        emitToUser(targetUserId, "call-ended", {
          from: userId,
          endedBy: userId,
          callId,
          roomId,
        });
      }
      if (isSafeString(roomId)) {
        socket.leave(roomId);
      }
    });

    socket.on("disconnect", () => {
      const becameOffline = removeUserSocket(userId, socket.id);
      if (becameOffline) {
        emitOnlineUsers();
      }
    });
  });

  return io;
};

export const getReceiverSocketId = (receiverId) => {
  return getUserSocketIds(receiverId)[0];
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized!");
  }
  return io;
};
