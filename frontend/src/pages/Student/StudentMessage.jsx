import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  CheckCheck,
  MessageSquare,
  Loader2,
  User,
  Phone,
  ArrowLeft
} from 'lucide-react';
import chatService from '../../services/chatService';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { getMyInstructors } from '../../services/userService';
import { useCall } from '../../context/CallContext';

const InstructorMessages = () => {
  const { socket, onlineUsers } = useSocket();
  const { startCall } = useCall();
  const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = userFromStorage?._id || userFromStorage?.id || '';

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setMessagesLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
    }
  }, [selectedChat]);

  // Real-time message & read status listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const isFromActiveChat = 
        newMessage.sender === selectedChat || 
        newMessage.sender?._id === selectedChat;

      if (isFromActiveChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        chatService.markAsRead(selectedChat).catch((err) => console.error(err));
      }

      setConversations((prev) => {
        const chatIndex = prev.findIndex(
          (c) => c._id === newMessage.sender || c._id === newMessage.sender?._id || c._id === newMessage.receiver || c._id === newMessage.receiver?._id
        );

        if (chatIndex !== -1) {
          const updatedConversations = [...prev];
          const targetChat = { ...updatedConversations[chatIndex] };

          targetChat.lastMessage = newMessage.message;
          targetChat.lastMessageTime = newMessage.createdAt;

          // Increment unread if not active chat and not sent by current user
          const isOwn = newMessage.sender === currentUserId || newMessage.sender?._id === currentUserId;
          if (!isFromActiveChat && !isOwn) {
            targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;
          }

          updatedConversations.splice(chatIndex, 1);
          updatedConversations.unshift(targetChat);
          return updatedConversations;
        } else {
          fetchConversations(true);
          return prev;
        }
      });
    };

    const handleMessagesRead = ({ senderId, receiverId }) => {
      if (selectedChat === receiverId) {
        setMessages((prev) =>
          prev.map((msg) => {
            const isOwn = msg.sender === currentUserId || msg.sender?._id === currentUserId;
            if (isOwn && !msg.read) {
              return { ...msg, read: true };
            }
            return msg;
          })
        );
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [socket, selectedChat, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  const fetchConversations = async (isPolling = false) => {
    try {
      if (!isPolling) {
        setLoading(true);
      }

      // Fetch active conversations
      const data = await chatService.getConversations();
      const conversationsData = Array.isArray(data)
        ? data
        : (data?.conversations || []);

      // Fetch enrolled instructors
      let instructors = [];
      try {
        instructors = await getMyInstructors();
      } catch (err) {
        console.error("Failed to fetch enrolled instructors:", err);
      }

      // Merge active conversations with enrolled instructors (preventing duplicates)
      const mergedConversations = [...conversationsData];
      const instructorsList = Array.isArray(instructors) ? instructors : [];
      
      const uniqueInstructors = [];
      const seenIds = new Set();
      instructorsList.forEach(inst => {
        if (inst && inst._id && !seenIds.has(inst._id.toString())) {
          seenIds.add(inst._id.toString());
          uniqueInstructors.push(inst);
        }
      });

      uniqueInstructors.forEach((instructor) => {
        const hasConversation = conversationsData.some(
          (c) => c._id.toString() === instructor._id.toString()
        );

        if (!hasConversation) {
          mergedConversations.push({
            _id: instructor._id,
            name: instructor.name,
            email: instructor.email,
            profileImage: instructor.profileImage,
            lastMessage: "No messages yet. Click to start chatting!",
            lastMessageTime: new Date(0).toISOString(),
            unreadCount: 0,
            isInstructorOnly: true,
          });
        }
      });

      // Sort: active chats first, new instructors at the bottom
      mergedConversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(mergedConversations);

      if (mergedConversations.length > 0 && !selectedChat && !isPolling) {
        const defaultChatId = mergedConversations[0]._id;
        setSelectedChat(defaultChatId);
        chatService.markAsRead(defaultChatId).catch((err) => console.error("Error marking default chat as read:", err));
        const activeChat = mergedConversations.find(c => c._id === defaultChatId);
        if (activeChat) activeChat.unreadCount = 0;
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  };

  const fetchMessages = async (
    userId,
    isPolling = false
  ) => {

    try {

      if (!isPolling) {
        setMessagesLoading(true);
      }

      const data = await chatService.getMessages(userId);

      setMessages(
        Array.isArray(data)
          ? data
          : (data?.messages || [])
      );

    } catch (error) {

      console.log(error);

    } finally {

      if (!isPolling) {
        setMessagesLoading(false);
      }

    }

  };

  const openConversation = async (chatId) => {

    setSelectedChat(chatId);

    try {

      await chatService.markAsRead(chatId);

      setConversations((prev) =>
        prev.map((chat) =>
          chat._id === chatId
            ? {
                ...chat,
                unreadCount: 0
              }
            : chat
        )
      );

    } catch (error) {

      console.log(error);

    }

  };

  const handleSendMessage = async (e) => {

    e.preventDefault();

    if (!messageText.trim() || !selectedChat) {
      return;
    }

    try {

      const tempMessage = messageText;

      setMessageText('');

      const sentMsg = await chatService.sendMessage(
        selectedChat,
        tempMessage
      );

      // Append immediately
      setMessages((prev) => {
        if (prev.some((m) => m._id === sentMsg._id)) return prev;
        return [...prev, sentMsg];
      });

      // Update sidebar locally (bubble to top)
      setConversations((prev) => {
        const chatIndex = prev.findIndex((c) => c._id === selectedChat);
        if (chatIndex !== -1) {
          const updatedConversations = [...prev];
          const targetChat = { ...updatedConversations[chatIndex] };
          targetChat.lastMessage = sentMsg.message;
          targetChat.lastMessageTime = sentMsg.createdAt;
          updatedConversations.splice(chatIndex, 1);
          updatedConversations.unshift(targetChat);
          return updatedConversations;
        } else {
          fetchConversations(true);
          return prev;
        }
      });

    } catch (error) {

      toast.error('Failed to send message');

    }

  };

  // Derived: must be before any function that uses selectedContact
  const selectedContact = Array.isArray(conversations)
    ? conversations.find((c) => c._id === selectedChat)
    : null;

  const handleStartCall = () => {
    if (!selectedChat || !selectedContact || !socket) return;

    if (!onlineUsers.includes(selectedChat)) {
      toast.error(`${selectedContact.name} is offline`);
      return;
    }

    startCall({
      peerId: selectedChat,
      peerName: selectedContact.name,
      peerAvatar: selectedContact.profileImage || '',
    });
  };

  if (loading) {

    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );

  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white overflow-hidden">

      {/* Sidebar */}
      <aside className={`w-full lg:w-96 border-r border-slate-100 flex flex-col overflow-hidden ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>

        <div className="p-6 border-b border-slate-100 flex items-center justify-between">

          <h2 className="text-xl font-bold text-slate-900">
            Messages
          </h2>

          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <MessageSquare size={20} />
          </div>

        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">

          {
            conversations.length > 0 ? (
              conversations.map((chat) => (

                <div
                  key={chat._id}
                  onClick={() => openConversation(chat._id)}
                  className={`p-5 flex gap-4 cursor-pointer transition-all relative group ${
                    selectedChat === chat._id
                      ? 'bg-blue-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                >

                  {
                    selectedChat === chat._id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                    )
                  }

                  <div className="relative flex-shrink-0">

                    <img
                      src={
                        chat.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=2563eb&color=fff`
                      }
                      alt={chat.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                    />

                    {onlineUsers.includes(chat._id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}

                  </div>

                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {chat.name}
                        </h4>
                        {chat.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[20px] h-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold shrink-0">
                        {chat.lastMessageTime && new Date(chat.lastMessageTime).getTime() > 0 ? (
                          new Date(chat.lastMessageTime).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )
                        ) : (
                          ''
                        )}
                      </span>

                    </div>

                    <p className="text-xs text-slate-500 truncate leading-relaxed font-medium">
                      {chat.lastMessage}
                    </p>

                  </div>

                </div>

              ))
            ) : (

              <div className="p-10 text-center space-y-4 opacity-50">

                <User
                  className="mx-auto text-slate-300"
                  size={40}
                />

                <p className="text-sm text-slate-500 font-medium">
                  No conversations yet.
                </p>

              </div>

            )
          }

        </div>

      </aside>

      {/* Chat Area */}
      <main className={`flex-1 flex flex-col overflow-hidden bg-white ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>

        {
          selectedChat ? (
            <>

              {/* Header */}
              <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">

              <div className="flex items-center gap-4">

                  {/* Back Button for Mobile */}
                  <button 
                    onClick={() => setSelectedChat(null)}
                    className="lg:hidden p-2 -ml-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <img
                    src={
                      selectedContact?.profileImage ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact?.name || 'User')}&background=random`
                    }
                    className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-white"
                    alt="Avatar"
                  />

                  <div>

                    <h3 className="font-bold text-slate-900 text-base">
                      {selectedContact?.name}
                    </h3>

                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">
                        {selectedContact?.email}
                      </p>
                      <span className="text-[10px] text-slate-300">•</span>
                      <p className="text-xs flex items-center gap-1">
                        {onlineUsers.map(String).includes(String(selectedContact?._id)) ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
                            <span className="text-green-600 font-bold">Online</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-medium">Offline</span>
                        )}
                      </p>
                    </div>

                  </div>

                </div>

                {/* Call Button - Always Visible */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStartCall}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${
                      onlineUsers.map(String).includes(String(selectedContact?._id))
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-green-200 cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                    title={onlineUsers.map(String).includes(String(selectedContact?._id)) ? "Start Voice Call" : `${selectedContact?.name || 'Instructor'} is offline`}
                  >
                    <Phone size={16} className={onlineUsers.map(String).includes(String(selectedContact?._id)) ? "animate-pulse" : ""} />
                    <span>Voice Call</span>
                  </button>
                </div>

              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">

                {
                  messages.length === 0 ? (

                    <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">

                      <MessageSquare
                        size={48}
                        className="text-slate-300"
                      />

                      <p className="text-slate-500 font-medium">
                        No messages yet.
                      </p>

                    </div>

                  ) : (

                    messages.map((msg) => {

                      const isOwn =
                        msg.sender === currentUserId ||
                        msg.sender?._id === currentUserId;

                      return (

                        <div
                          key={msg._id}
                          className={`flex ${
                            isOwn
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >

                          <div className={`flex flex-col max-w-[75%] space-y-1 ${
                            isOwn
                              ? 'items-end'
                              : 'items-start'
                          }`}>

                            <div
                              className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-tr-none'
                                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                              }`}
                            >
                              {msg.message}
                            </div>

                            <div className="flex items-center gap-1.5 px-2">

                              <span className="text-[10px] text-slate-400 font-bold">

                                {
                                  new Date(
                                    msg.createdAt
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }
                                  )
                                }

                              </span>

                              {
                                isOwn && (
                                  <CheckCheck
                                    size={12}
                                    className={
                                      msg.read
                                        ? 'text-blue-500'
                                        : 'text-slate-300'
                                    }
                                  />
                                )
                              }

                            </div>

                          </div>

                        </div>

                      );

                    })

                  )
                }

                <div ref={messagesEndRef} />

              </div>

              {/* Input */}
              <footer className="p-6 border-t border-slate-100 bg-white">

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 bg-slate-50 rounded-3xl border border-slate-200 flex items-center gap-3"
                >

                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) =>
                      setMessageText(e.target.value)
                    }
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className={`p-3 rounded-2xl transition-all shadow-lg flex items-center justify-center ${
                      messageText.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >

                    <Send size={20} />

                  </button>

                </form>

              </footer>

            </>
          ) : (

            <div className="flex-1 flex flex-col items-center justify-center opacity-40 space-y-6">

              <div className="p-10 bg-slate-100 rounded-full">

                <MessageSquare
                  size={80}
                  className="text-slate-300"
                />

              </div>

              <p className="text-xl font-bold text-slate-500">
                Select a conversation to start chatting
              </p>

            </div>

          )
        }

      </main>

    </div>
  );

};

export default InstructorMessages;
