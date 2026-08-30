import mongoose from "mongoose";
import Message from "../models/message.js";
import User from "../models/User.js";
import { getReceiverSocketId, getIo } from "../sockets/chatSocket.js";
import { sendEmail } from "../utils/sendEmail.js";
import { env } from "../config/env.config.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";

const MAX_CONVERSATION_SCAN = Number(process.env.CHAT_CONVERSATION_SCAN_LIMIT || 1000);

// send message
export const sendMessageService = async ({ sender, receiver, message }) => {
  const newMessage = await Message.create({
    sender,
    receiver,
    message,
  });

  try {
    const receiverSocketId = getReceiverSocketId(receiver);
    if (receiverSocketId) {
      const io = getIo();
      io.to(receiverSocketId).emit("new-message", newMessage);
    } else {
      setImmediate(async () => {
        try {
          const [receiverUser, senderUser] = await Promise.all([
            User.findById(receiver).select("name email"),
            User.findById(sender).select("name"),
          ]);

          if (receiverUser && receiverUser.email && senderUser) {
            const senderName = senderUser.name || "A user";
            const mailSubject = `New Message from ${senderName}`;
            const safePreview = String(message || "").slice(0, 100);
            const mailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 24px;">You have a new message!</h1>
                </div>
                <div style="padding: 24px; color: #334155; line-height: 1.6;">
                  <p>Hello <strong>${receiverUser.name}</strong>,</p>
                  <p><strong>${senderName}</strong> has sent you a message on StackVerseHub.</p>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-style: italic; color: #475569;">
                    "${safePreview}${String(message || "").length > 100 ? "..." : ""}"
                  </div>
                  <p>Log in to your dashboard to view the full conversation and reply.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${env.CLIENT_URL || "http://localhost:5173"}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reply Now</a>
                  </div>
                  <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    This is an automated notification from StackVerseHub. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            `;
            await sendEmail(receiverUser.email, mailSubject, mailHtml);
          }
        } catch (mailErr) {
          console.error("[Email Notification] Failed to send chat email:", mailErr.message);
        }
      });
    }
  } catch (err) {
    console.error("[Socket] Failed to emit new-message:", err.message);
  }

  return newMessage;
};

// get conversation
export const getMessagesService = async ({ userId, currentUserId, query = {} }) => {
  const { page, limit, skip } = getPagination(query, {
    defaultLimit: 50,
    maxLimit: Number(process.env.CHAT_MESSAGES_MAX_LIMIT || 100),
  });

  await Message.updateMany(
    {
      receiver: currentUserId,
      sender: userId,
      read: false,
    },
    {
      read: true,
    }
  );

  try {
    const senderSocketId = getReceiverSocketId(userId);
    const receiverSocketId = getReceiverSocketId(currentUserId);
    const io = getIo();
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-read", {
        senderId: userId,
        receiverId: currentUserId,
      });
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messages-read", {
        senderId: userId,
        receiverId: currentUserId,
      });
    }
  } catch (err) {
    console.error("[Socket] Failed to emit read receipt:", err.message);
  }

  const filter = {
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
  };

  const [total, newestMessages] = await Promise.all([
    Message.countDocuments(filter),
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    messages: newestMessages.reverse(),
    pagination: buildPaginationMeta({ page, limit, total }),
  };
};

// mark as read
export const markAsReadService = async ({ currentUserId, userId }) => {
  await Message.updateMany(
    {
      receiver: currentUserId,
      sender: userId,
      read: false,
    },
    {
      read: true,
    }
  );

  try {
    const senderSocketId = getReceiverSocketId(userId);
    const receiverSocketId = getReceiverSocketId(currentUserId);
    const io = getIo();
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-read", {
        senderId: userId,
        receiverId: currentUserId,
      });
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messages-read", {
        senderId: userId,
        receiverId: currentUserId,
      });
    }
  } catch (err) {
    console.error("[Socket] Failed to emit read receipt:", err.message);
  }

  return true;
};

// get conversations list (contacts)
export const getConversationsService = async (userId, query = {}) => {
  const currentUser = await User.findById(userId).select("role").lean();
  const { page, limit, skip } = getPagination(query, {
    defaultLimit: 30,
    maxLimit: Number(process.env.CHAT_CONVERSATIONS_MAX_LIMIT || 100),
  });

  const objectUserId = new mongoose.Types.ObjectId(userId);
  const roleMatch = {};
  if (currentUser?.role === "student") roleMatch["otherUser.role"] = "instructor";
  if (currentUser?.role === "instructor") roleMatch["otherUser.role"] = "student";

  const pipeline = [
    { $match: { $or: [{ sender: objectUserId }, { receiver: objectUserId }] } },
    { $sort: { createdAt: -1 } },
    { $limit: MAX_CONVERSATION_SCAN },
    {
      $project: {
        otherUserId: {
          $cond: [{ $eq: ["$sender", objectUserId] }, "$receiver", "$sender"],
        },
        message: 1,
        createdAt: 1,
        unread: {
          $cond: [
            { $and: [{ $eq: ["$receiver", objectUserId] }, { $eq: ["$read", false] }] },
            1,
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$otherUserId",
        lastMessage: { $first: "$message" },
        lastMessageTime: { $first: "$createdAt" },
        unreadCount: { $sum: "$unread" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "otherUser",
      },
    },
    { $unwind: "$otherUser" },
    ...(Object.keys(roleMatch).length ? [{ $match: roleMatch }] : []),
    { $sort: { lastMessageTime: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: "$otherUser._id",
              name: "$otherUser.name",
              email: "$otherUser.email",
              profileImage: "$otherUser.profileImage",
              lastMessage: 1,
              lastMessageTime: 1,
              unreadCount: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await Message.aggregate(pipeline);
  const conversations = result?.data || [];
  const total = result?.total?.[0]?.count || conversations.length;

  return {
    conversations,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
};
