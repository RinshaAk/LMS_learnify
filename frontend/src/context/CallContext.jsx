import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { useSocket } from './SocketContext.jsx';
import AudioCall from '../components/live/AudioCall.jsx';

const idleCall = {
  status: 'idle',
  callId: '',
  roomId: '',
  peerId: '',
  peerName: '',
  peerAvatar: '',
};

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};

const getUserId = (user) => user?._id || user?.id || '';

export const CallProvider = ({ children }) => {
  const { socket, onlineUsers } = useSocket();
  const { user } = useSelector((state) => state.auth);
  const currentUserId = getUserId(user);
  const [callInfo, setCallInfo] = useState(idleCall);
  const ringtoneRef = useRef({
    audioContext: null,
    intervalId: null,
    timeoutIds: [],
  });

  const stopRingtone = () => {
    const ringtone = ringtoneRef.current;
    if (ringtone.intervalId) {
      clearInterval(ringtone.intervalId);
      ringtone.intervalId = null;
    }
    ringtone.timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
    ringtone.timeoutIds = [];
  };

  const playIncomingTone = () => {
    if (ringtoneRef.current.intervalId || typeof window === 'undefined') {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    const audioContext = ringtoneRef.current.audioContext || new AudioContext();
    ringtoneRef.current.audioContext = audioContext;

    const playTone = (startOffset = 0) => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startTime = audioContext.currentTime + startOffset;
      const endTime = startTime + 0.55;

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, startTime);
      oscillator.frequency.setValueAtTime(480, startTime + 0.2);
      oscillator.frequency.setValueAtTime(440, startTime + 0.4);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.04);
      gainNode.gain.setValueAtTime(0.12, endTime - 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    };

    const playRing = () => {
      playTone(0);
      playTone(0.72);
    };

    playRing();
    ringtoneRef.current.intervalId = setInterval(playRing, 2600);
  };

  const resetCall = () => {
    stopRingtone();
    setCallInfo(idleCall);
  };

  const startCall = ({ peerId, peerName, peerAvatar = '' }) => {
    if (!socket || !currentUserId) {
      toast.error('Voice call is not connected yet');
      return false;
    }

    const targetUserId = peerId?.toString();
    if (!targetUserId) {
      toast.error('Missing call receiver');
      return false;
    }

    if (targetUserId === currentUserId.toString()) {
      toast.error('You cannot call yourself');
      return false;
    }

    if (callInfo.status !== 'idle') {
      toast.error('You are already in a call');
      return false;
    }

    if (!onlineUsers.map(String).includes(targetUserId)) {
      toast.error(`${peerName || 'User'} is offline`);
      return false;
    }

    const callId = `call-${currentUserId}-${targetUserId}-${Date.now()}`;

    setCallInfo({
      status: 'outgoing',
      callId,
      roomId: callId,
      peerId: targetUserId,
      peerName: peerName || 'User',
      peerAvatar,
    });

    socket.emit('call-user', {
      userToCall: targetUserId,
      callerName: user?.name || 'User',
      callerAvatar: user?.profileImage || '',
      roomId: callId,
      callId,
    });

    return true;
  };

  useEffect(() => {
    if (!socket || !currentUserId) return undefined;

    const isCurrentCall = (payload) => (
      payload?.callId && payload.callId === callInfo.callId
    );

    const handleIncomingCall = ({ from, callerName, callerAvatar, roomId, callId }) => {
      const callerId = from?.toString();
      if (!callerId || !roomId || !callId || callerId === currentUserId.toString()) {
        return;
      }

      setCallInfo((prev) => {
        if (prev.status !== 'idle') {
          socket.emit('reject-call', { to: callerId, callId });
          return prev;
        }

        return {
          status: 'incoming',
          callId,
          roomId,
          peerId: callerId,
          peerName: callerName || 'User',
          peerAvatar: callerAvatar || '',
        };
      });
    };

    const handleCallAccepted = (payload) => {
      if (!isCurrentCall(payload)) return;
      setCallInfo((prev) => (
        prev.status === 'outgoing'
          ? { ...prev, status: 'ongoing' }
          : prev
      ));
    };

    const handleCallRejected = (payload) => {
      if (!isCurrentCall(payload)) return;
      toast.error('Call declined');
      resetCall();
    };

    const handleCallEnded = (payload) => {
      if (!isCurrentCall(payload)) return;
      toast('Call ended');
      resetCall();
    };

    const handleCallUnavailable = (payload) => {
      if (!isCurrentCall(payload)) return;
      toast.error(payload?.message || 'User is unavailable');
      resetCall();
    };

    const handleCallError = (payload) => {
      if (payload?.callId && payload.callId !== callInfo.callId) return;
      toast.error(payload?.message || 'Call failed');
      resetCall();
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-unavailable', handleCallUnavailable);
    socket.on('call-error', handleCallError);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-unavailable', handleCallUnavailable);
      socket.off('call-error', handleCallError);
    };
  }, [socket, currentUserId, callInfo.callId]);

  useEffect(() => {
    if (!socket) {
      resetCall();
    }
  }, [socket]);

  useEffect(() => {
    if (callInfo.status === 'incoming') {
      playIncomingTone();
      return stopRingtone;
    }

    stopRingtone();
    return undefined;
  }, [callInfo.status]);

  const acceptCall = () => {
    if (!socket || callInfo.status !== 'incoming') return;

    stopRingtone();
    setCallInfo((prev) => ({ ...prev, status: 'ongoing' }));
    socket.emit('accept-call', {
      to: callInfo.peerId,
      callId: callInfo.callId,
      roomId: callInfo.roomId,
    });
  };

  const rejectCall = () => {
    stopRingtone();
    if (socket && callInfo.peerId && callInfo.callId) {
      socket.emit('reject-call', {
        to: callInfo.peerId,
        callId: callInfo.callId,
      });
    }
    resetCall();
  };

  const endCall = () => {
    stopRingtone();
    if (socket && callInfo.peerId && callInfo.callId) {
      socket.emit('end-call', {
        to: callInfo.peerId,
        callId: callInfo.callId,
        roomId: callInfo.roomId,
      });
    }
    resetCall();
  };

  const value = useMemo(() => ({
    callInfo,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  }), [callInfo, socket, currentUserId, onlineUsers]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {callInfo.status !== 'idle' && socket && (
        <AudioCall
          roomId={callInfo.roomId}
          peerId={callInfo.peerId}
          peerName={callInfo.peerName}
          peerAvatar={callInfo.peerAvatar}
          callDirection={callInfo.status}
          socket={socket}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  );
};
