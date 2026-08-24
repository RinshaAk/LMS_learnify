import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import User from "../models/User.js";

let io;
const userSocketMap = new Map(); // userId -> Set<socketId>

const normalizeId = (id) => id?.toString();

const addUserSocket = (userId, socketId) => {
  const key = normalizeId(userId);
  if (!key) return;

  const sockets = userSocketMap.get(key) || new Set();
  sockets.add(socketId);
  userSocketMap.set(key, sockets);
};

const removeUserSocket = (userId, socketId) => {
  const key = normalizeId(userId);
  if (!key) return;

  const sockets = userSocketMap.get(key);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSocketMap.delete(key);
  }
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
      const user = await User.findById(decoded.id).select("_id isBlocked");

      if (!user || user.isBlocked) {
        return next(new Error("Authentication failed"));
      }

      socket.userId = user._id.toString();
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] Client connected. SocketID: ${socket.id}, UserID: ${userId}`);

    addUserSocket(userId, socket.id);

    // Broadcast online users
    emitOnlineUsers();

    // WebRTC Signaling Events
    socket.on("join-room", (roomId) => {
      console.log(`[Socket] User ${socket.id} joined room ${roomId}`);
      socket.join(roomId);

      // Check if other users are already in the room
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (clientsInRoom && clientsInRoom.size > 1) {
        console.log(`[Socket] Room ${roomId} has other clients. Notifying other-user-exists.`);
        socket.emit("other-user-exists");
      }
    });

    socket.on("offer", ({ roomId, offer }) => {
      console.log(`[Socket] Relay offer from ${socket.id} to room ${roomId}`);
      socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer }) => {
      console.log(`[Socket] Relay answer from ${socket.id} to room ${roomId}`);
      socket.to(roomId).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      console.log(`[Socket] Relay ice-candidate from ${socket.id} to room ${roomId}`);
      socket.to(roomId).emit("ice-candidate", candidate);
    });

    // Audio Call signaling events
    socket.on("call-user", ({ userToCall, callerName, callerAvatar, roomId, callId }) => {
      const targetUserId = normalizeId(userToCall);
      if (!targetUserId || !roomId || !callId) {
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
        callerName: callerName || "User",
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

    socket.on("accept-call", ({ to, callId, roomId }) => {
      const targetUserId = normalizeId(to);
      if (!targetUserId || !callId) {
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

    socket.on("reject-call", ({ to, callId }) => {
      const targetUserId = normalizeId(to);
      if (!targetUserId || !callId) {
        socket.emit("call-error", { callId, message: "Invalid reject call request" });
        return;
      }

      emitToUser(targetUserId, "call-rejected", {
        from: userId,
        rejecterId: userId,
        callId,
      });
    });

    socket.on("end-call", ({ to, roomId, callId }) => {
      const targetUserId = normalizeId(to);
      if (targetUserId) {
        emitToUser(targetUserId, "call-ended", {
          from: userId,
          endedBy: userId,
          callId,
          roomId,
        });
      }
      if (roomId) {
        socket.leave(roomId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected. SocketID: ${socket.id}`);
      removeUserSocket(userId, socket.id);
      emitOnlineUsers();
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
