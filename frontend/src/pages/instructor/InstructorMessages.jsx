import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  MoreVertical, 
  CheckCheck, 
  Filter, 
  MessageSquare,
  BookOpen,
  Image as ImageIcon,
  Loader2,
  User,
  Phone,
  ArrowLeft
} from 'lucide-react';
import chatService from '../../services/chatService';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import AudioCall from '../../components/live/AudioCall';

const InstructorMessages = () => {
  const { socket, onlineUsers } = useSocket();
  const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = userFromStorage?._id || userFromStorage?.id || '';

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setMessagesLoading] = useState(false);
  const [callInfo, setCallInfo] = useState({
    status: 'idle', // 'idle' | 'outgoing' | 'incoming' | 'ongoing'
    roomId: '',
    peerId: '',
    peerName: '',
    peerAvatar: '',
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
    }
  }, [selectedChat]);

  // Real-time socket event listeners for Instructor Messages
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

    const handleIncomingCall = ({ from, callerName, roomId }) => {
      console.log("[Socket] Incoming call from:", from);
      const callerConversation = conversations.find(c => c._id === from);
      setCallInfo({
        status: 'incoming',
        roomId,
        peerId: from,
        peerName: callerName,
        peerAvatar: callerConversation?.profileImage || '',
      });
    };

    const handleCallAccepted = ({ from }) => {
      console.log("[Socket] Call accepted by:", from);
      setCallInfo(prev => ({
        ...prev,
        status: 'ongoing',
      }));
    };

    const handleCallRejected = ({ from }) => {
      console.log("[Socket] Call rejected by:", from);
      toast.error("Call declined");
      setCallInfo({
        status: 'idle',
        roomId: '',
        peerId: '',
        peerName: '',
        peerAvatar: '',
      });
    };

    const handleCallEnded = ({ from }) => {
      console.log("[Socket] Call ended by:", from);
      toast("Call ended");
      setCallInfo({
        status: 'idle',
        roomId: '',
        peerId: '',
        peerName: '',
        peerAvatar: '',
      });
    };

    const handleCallError = ({ message }) => {
      toast.error(message);
      setCallInfo({
        status: 'idle',
        roomId: '',
        peerId: '',
        peerName: '',
        peerAvatar: '',
      });
    };

    socket.on("new-message", handleNewMessage);
    socket.on("messages-read", handleMessagesRead);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-error", handleCallError);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-read", handleMessagesRead);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-error", handleCallError);
    };
  }, [socket, selectedChat, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const data = await chatService.getConversations();
      const conversationsData = Array.isArray(data) ? data : (data?.conversations || []);
      setConversations(conversationsData);
      
      if (conversationsData.length > 0 && !selectedChat && !isPolling) {
        const defaultChatId = conversationsData[0]._id;
        setSelectedChat(defaultChatId);
        chatService.markAsRead(defaultChatId).catch((err) => console.error("Error marking default chat as read:", err));
        conversationsData[0].unreadCount = 0;
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const fetchMessages = async (userId, isPolling = false) => {
    try {
      if (!isPolling) setMessagesLoading(true);
      const data = await chatService.getMessages(userId);
      setMessages(Array.isArray(data) ? data : (data?.messages || []));
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!isPolling) setMessagesLoading(false);
    }
  };

  const openConversation = async (chatId) => {

  setSelectedChat(chatId);

  try {

    await chatService.markAsRead(chatId);

    setConversations((prev) =>
      prev.map((chat) =>
        chat._id === chatId
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );

  } catch (error) {

    console.log(error);

  }

};
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    try {
      const tempMsg = messageText;
      setMessageText('');
      const sentMsg = await chatService.sendMessage(selectedChat, tempMsg);
      
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
    } catch (err) {
      toast.error("Failed to send message");
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

    const roomId = `call-${currentUserId}-${selectedChat}-${Date.now()}`;
    const callerName = userFromStorage?.name || "Instructor";

    // Caller joins the room immediately so they're ready for the offer
    socket.emit("join-room", roomId);

    setCallInfo({
      status: 'outgoing',
      roomId,
      peerId: selectedChat,
      peerName: selectedContact.name,
      peerAvatar: selectedContact.profileImage || '',
    });

    socket.emit("call-user", {
      userToCall: selectedChat,
      callerName,
      roomId,
    });
  };

  const handleAcceptCall = () => {
    if (!socket || !callInfo.peerId) return;
    // Callee must join the WebRTC room BEFORE accepting so offer/answer relay works
    if (callInfo.roomId) {
      socket.emit("join-room", callInfo.roomId);
    }
    socket.emit("accept-call", { to: callInfo.peerId });
    setCallInfo((prev) => ({
      ...prev,
      status: 'ongoing',
    }));
  };

  const handleRejectCall = () => {
    if (!socket || !callInfo.peerId) return;
    socket.emit("reject-call", { to: callInfo.peerId });
    setCallInfo({
      status: 'idle',
      roomId: '',
      peerId: '',
      peerName: '',
      peerAvatar: '',
    });
  };

  const handleEndCall = () => {
    if (!socket) return;
    if (callInfo.peerId) {
      socket.emit("end-call", { to: callInfo.peerId, roomId: callInfo.roomId });
    }
    setCallInfo({
      status: 'idle',
      roomId: '',
      peerId: '',
      peerName: '',
      peerAvatar: '',
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isContactOnline = onlineUsers.map(String).includes(String(selectedContact?._id));

  return (
    <div className="h-full flex flex-col md:flex-row bg-white overflow-hidden">

      {/* ── Sidebar ── */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>

        {/* Sidebar Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-900">Messages</h3>
          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={18} />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => openConversation(chat._id)}
              className={`px-4 py-3.5 flex gap-3 cursor-pointer transition-all relative group ${
                selectedChat === chat._id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
              }`}
            >
              {selectedChat === chat._id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
              )}
              <div className="relative flex-shrink-0">
                <img
                  src={chat.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=2563eb&color=fff`}
                  alt={chat.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
                {onlineUsers.map(String).includes(String(chat._id)) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {chat.name}
                    </h4>
                    {chat.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-1">
                    {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 opacity-40">
              <User size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-500">No chats found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Window ── */}
      <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/30 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* ── Chat Header ── */}
            <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
              {/* Back Button for Mobile */}
              <button 
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={selectedContact?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact?.name || 'User')}&background=random`}
                  alt="avatar"
                  className="w-11 h-11 rounded-xl object-cover border-2 border-slate-50 shadow-sm"
                />
                {isContactOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Name + Status */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900 truncate leading-tight">{selectedContact?.name}</h4>
                <p className={`text-xs font-semibold ${isContactOnline ? 'text-green-600' : 'text-slate-400'}`}>
                  {isContactOnline ? '🟢 Online' : 'Offline'}
                </p>
              </div>

              {/* ── VOICE CALL BUTTON ── */}
              <button
                onClick={handleStartCall}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                  isContactOnline
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title={isContactOnline ? 'Start Voice Call' : `${selectedContact?.name || 'User'} is offline`}
              >
                <Phone size={15} className={isContactOnline ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">Voice Call</span>
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {Array.isArray(messages) && messages.map((msg) => {
                const isOwn = msg.sender === currentUserId || msg.sender?._id === currentUserId;
                return (
                  <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col max-w-md space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm font-medium shadow-sm ${
                        isOwn
                          ? 'bg-slate-900 text-white rounded-tr-none'
                          : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                      }`}>
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-1.5 px-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                          <CheckCheck size={12} className={msg.read ? 'text-blue-500' : 'text-slate-300'} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type your reply here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 min-w-0 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className={`flex-shrink-0 p-3 rounded-2xl transition-all ${
                    messageText.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg active:scale-95'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-5">
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 shadow-inner">
              <MessageSquare size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Select a Conversation</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2">
                Choose a student from the sidebar to start addressing their doubts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── AudioCall Overlay ── */}
      {callInfo.status !== 'idle' && (
        <AudioCall
          roomId={callInfo.roomId}
          peerId={callInfo.peerId}
          peerName={callInfo.peerName}
          peerAvatar={callInfo.peerAvatar}
          callDirection={callInfo.status}
          socket={socket}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEndCall={handleEndCall}
        />
      )}

    </div>
  );
};

export default InstructorMessages;


