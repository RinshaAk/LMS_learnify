import Message from "../models/message.js";
import User from "../models/User.js";
import { getReceiverSocketId, getIo } from "../sockets/chatSocket.js";
import { sendEmail } from "../utils/sendEmail.js";
import { env } from "../config/env.config.js";

// send message
export const sendMessageService = async ({ sender, receiver, message }) => {
  const newMessage = await Message.create({
    sender,
    receiver,
    message,
  });

  // Emit real-time socket event to the receiver
  try {
    const receiverSocketId = getReceiverSocketId(receiver);
    if (receiverSocketId) {
      const io = getIo();
      io.to(receiverSocketId).emit("new-message", newMessage);
    } else {
      // Receiver is offline, send email notification
      (async () => {
        try {
          const receiverUser = await User.findById(receiver);
          const senderUser = await User.findById(sender);
          if (receiverUser && receiverUser.email && senderUser) {
            const senderName = senderUser.name || "A user";
            const mailSubject = `New Message from ${senderName}`;
            const mailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 24px;">You have a new message!</h1>
                </div>
                <div style="padding: 24px; color: #334155; line-height: 1.6;">
                  <p>Hello <strong>${receiverUser.name}</strong>,</p>
                  <p><strong>${senderName}</strong> has sent you a message on Learnify.</p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-style: italic; color: #475569;">
                    "${message.length > 100 ? message.substring(0, 100) + '...' : message}"
                  </div>

                  <p>Log in to your dashboard to view the full conversation and reply.</p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${env.CLIENT_URL || 'http://localhost:5173'}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reply Now</a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    This is an automated notification from Learnify. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            `;
            await sendEmail(receiverUser.email, mailSubject, mailHtml);
          }
        } catch (mailErr) {
          console.error("[Email Notification] Failed to send chat email:", mailErr);
        }
      })();
    }
  } catch (err) {
    console.error("[Socket] Failed to emit new-message:", err);
  }

  return newMessage;
};

// get conversation
export const getMessagesService = async ({ userId, currentUserId }) => {
  // Mark messages from other user to current user as read
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

  // Emit real-time read receipt to the sender and receiver
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
    console.error("[Socket] Failed to emit read receipt:", err);
  }

  const chatMessages = await Message.find({
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
  }).sort({ createdAt: 1 });

  return chatMessages;
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

  // Emit real-time read receipt to the sender and receiver
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
    console.error("[Socket] Failed to emit read receipt:", err);
  }

  return true;
};

// get conversations list (contacts)
export const getConversationsService = async (userId) => {
  const currentUser = await User.findById(userId).select("role");

  const userMessages = await Message.find({
    $or: [{ sender: userId }, { receiver: userId }],
  }).populate("sender receiver", "name email profileImage role");

  const contacts = new Map();

 userMessages.forEach((msg) => {
  // Check if sender or receiver was deleted from the database
  if (!msg.sender || !msg.receiver) return;

  const otherUser =
    msg.sender._id.toString() === userId.toString()
      ? msg.receiver
      : msg.sender;

  // Role-based filtering:
  // - Students can only see instructors
  // - Instructors can only see students
  if (currentUser?.role === "student" && otherUser.role !== "instructor") return;
  if (currentUser?.role === "instructor" && otherUser.role !== "student") return;

  const isUnread =
    msg.receiver._id.toString() === userId.toString() &&
    !msg.read;

  if (!contacts.has(otherUser._id.toString())) {

    contacts.set(otherUser._id.toString(), {

      _id: otherUser._id,
      name: otherUser.name,
      email: otherUser.email,
      profileImage: otherUser.profileImage,
      lastMessage: msg.message,
      lastMessageTime: msg.createdAt,

      // FIXED
      unreadCount: isUnread ? 1 : 0,

    });

  } else {

    const existing =
      contacts.get(otherUser._id.toString());

    // FIXED
    if (isUnread) {
      existing.unreadCount += 1;
    }

    // Update latest message
    if (
      new Date(msg.createdAt) >
      new Date(existing.lastMessageTime)
    ) {

      existing.lastMessage = msg.message;
      existing.lastMessageTime = msg.createdAt;

    }

  }

});

  const sortedContacts = Array.from(contacts.values()).sort(
    (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
  );

  return sortedContacts;
};
