import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import { getConversationsService, getMessagesService, markAsReadService, sendMessageService } from "../services/chatServices.js";
import { createNotification } from "./notificationController.js";
import User from "../models/User.js";

export const getConversations = asyncHandler(async (req, res) => {
  const result = await getConversationsService(req.user.id, req.query);
  res.json(result);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { receiver, message } = req.body;

  const newMessage = await sendMessageService({
    sender: req.user.id,
    receiver,
    message,
  });

  const sender = await User.findById(req.user.id).select("name");
  const receiverUser = await User.findById(receiver).select("role");
  const link = receiverUser?.role === "instructor" ? "/instructor/messages" : "/student/messages";

  createNotification({
    recipient: receiver,
    type: "new_message",
    title: "New Message",
    message: `${sender?.name || "Someone"} sent you a message: "${message.length > 60 ? message.slice(0, 60) + "..." : message}"`,
    link,
  });

  res.status(201).json(newMessage);
});

export const getMessages = asyncHandler(async (req, res) => {
  const result = await getMessagesService({
    userId: req.params.userId,
    currentUserId: req.user.id,
    query: req.query,
  });

  res.json(result);
});

export const markAsRead = asyncHandler(async (req, res) => {
  await markAsReadService({
    currentUserId: req.user.id,
    userId: req.params.userId,
  });

  res.json({ message: "Messages marked as read" });
});
