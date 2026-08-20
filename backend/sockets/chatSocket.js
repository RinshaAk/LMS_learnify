import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import User from "../models/User.js";

let io;
const userSocketMap = {}; // { userId: socketId }

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

    userSocketMap[userId] = socket.id;

    // Broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

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
    socket.on("call-user", ({ userToCall, callerName, roomId }) => {
      console.log(`[Socket] Call user ${userToCall} from ${userId}`);
      const receiverSocketId = userSocketMap[userToCall];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incoming-call", {
          from: userId,
          callerName,
          roomId
        });
      } else {
        socket.emit("call-error", { message: "User is offline" });
      }
    });

    socket.on("accept-call", ({ to }) => {
      console.log(`[Socket] Call accepted by ${userId} for ${to}`);
      const callerSocketId = userSocketMap[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-accepted", { from: userId });
      }
    });

    socket.on("reject-call", ({ to }) => {
      console.log(`[Socket] Call rejected by ${userId} for ${to}`);
      const callerSocketId = userSocketMap[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-rejected", { from: userId });
      }
    });

    socket.on("end-call", ({ to, roomId }) => {
      console.log(`[Socket] Call ended by ${userId} for ${to}`);
      const targetSocketId = userSocketMap[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-ended", { from: userId });
      }
      if (roomId) {
        socket.leave(roomId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected. SocketID: ${socket.id}`);
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
      }
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized!");
  }
  return io;
};
