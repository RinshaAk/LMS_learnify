import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, PhoneCall, Volume2, Loader2, Phone } from "lucide-react";
import toast from "react-hot-toast";

const AudioCall = ({
  roomId,
  peerName,
  peerAvatar,
  callDirection, // 'outgoing' | 'incoming' | 'ongoing'
  socket,
  onAccept,
  onReject,
  onEndCall,
}) => {
  const remoteAudioRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const iceCandidateQueue = useRef([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);

  // Timer for ongoing call
  useEffect(() => {
    if (callDirection !== "ongoing" || !isConnected) return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callDirection, isConnected]);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // WebRTC Peer Connection setup
  useEffect(() => {
    if (callDirection !== "ongoing" || !socket) return;

    let isMounted = true;
    const remoteStream = new MediaStream();

    const initCall = async () => {
      try {
        // 1. Get local microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream.current = stream;

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }

        // 2. Create peer connection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        // 3. Add local tracks
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // 4. Handle remote stream tracks
        peerConnection.current.ontrack = (event) => {
          console.log("[AudioCall] Remote track received");
          setIsConnected(true);
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              remoteStream.addTrack(track);
            });
          } else {
            remoteStream.addTrack(event.track);
          }
        };

        // 5. ICE candidate negotiation
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate,
            });
          }
        };

        peerConnection.current.onconnectionstatechange = () => {
          const state = peerConnection.current?.connectionState;
          console.log("[AudioCall] Connection state changed:", state);
          if (state === "connected") {
            setIsConnected(true);
            toast.success("Voice connection established!");
          } else if (state === "disconnected" || state === "failed") {
            setIsConnected(false);
            toast.error("Call connection lost");
            onEndCall();
          }
        };

        // 6. Join the signaling room
        socket.emit("join-room", roomId);

      } catch (err) {
        console.error("Error starting WebRTC audio call:", err);
        toast.error("Failed to access your microphone.");
        onEndCall();
      }
    };

    initCall();

    // ==========================================
    // Signaling events
    // ==========================================
    const handleOtherUserExists = async () => {
      console.log("[AudioCall] Peer exists, creating offer...");
      if (!peerConnection.current) return;
      try {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };

    const handleOffer = async (offer) => {
      console.log("[AudioCall] Offer received, setting remote desc and sending answer...");
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      } catch (error) {
        console.error("Error handling WebRTC offer:", error);
      }
    };

    const handleAnswer = async (answer) => {
      console.log("[AudioCall] Answer received, setting remote desc...");
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));

        // Drain queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    };

    const handleIceCandidate = async (candidate) => {
      if (!peerConnection.current) return;
      try {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      } catch (error) {
        console.error("Error adding WebRTC ICE candidate:", error);
      }
    };

    socket.on("other-user-exists", handleOtherUserExists);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      isMounted = false;
      socket.off("other-user-exists", handleOtherUserExists);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [callDirection, socket, roomId]);

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName || "User")}&background=2563eb&color=fff`;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-[2rem] shadow-[0_15px_50px_rgba(0,0,0,0.6)] p-6 text-white overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
      {/* Remote Audio Track (Hidden) */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

      <div className="flex flex-col items-center text-center space-y-4">
        {/* Pulsing Avatar */}
        <div className="relative">
          <img
            src={peerAvatar || defaultAvatar}
            alt={peerName}
            className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-slate-700/50 shadow-md"
          />
          {callDirection === "outgoing" && (
            <span className="absolute inset-0 rounded-[1.5rem] border-2 border-blue-500 animate-ping opacity-60"></span>
          )}
          {callDirection === "incoming" && (
            <span className="absolute inset-0 rounded-[1.5rem] border-2 border-green-500 animate-ping opacity-60"></span>
          )}
        </div>

        {/* Name and State */}
        <div>
          <h4 className="font-bold text-slate-100 text-base">{peerName}</h4>
          {callDirection === "outgoing" && (
            <p className="text-xs text-blue-400 font-black uppercase tracking-wider animate-pulse mt-1">Ringing...</p>
          )}
          {callDirection === "incoming" && (
            <p className="text-xs text-green-400 font-black uppercase tracking-wider animate-pulse mt-1">Incoming call</p>
          )}
          {callDirection === "ongoing" && (
            <div className="flex items-center gap-1.5 justify-center mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="text-xs text-slate-400 font-semibold">
                {isConnected ? formatDuration(duration) : "Connecting..."}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-4 pt-2">
          {callDirection === "incoming" ? (
            <>
              {/* Decline Button */}
              <button
                onClick={onReject}
                className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-lg active:scale-95 shadow-rose-600/30 flex items-center justify-center"
                title="Decline Call"
              >
                <PhoneOff size={20} className="rotate-135" />
              </button>

              {/* Accept Button */}
              <button
                onClick={onAccept}
                className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all shadow-lg active:scale-95 shadow-emerald-600/30 flex items-center justify-center animate-bounce"
                title="Accept Call"
              >
                <Phone size={20} className="animate-pulse" />
              </button>
            </>
          ) : (
            <>
              {/* Mute Button (Only for ongoing calls) */}
              {callDirection === "ongoing" && (
                <button
                  onClick={toggleMute}
                  disabled={!isConnected}
                  className={`p-4 rounded-full transition-all flex items-center justify-center ${
                    !isConnected 
                      ? "bg-slate-800/40 text-slate-600 cursor-not-allowed border border-transparent"
                      : isMuted
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/50"
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}

              {/* End / Cancel Call Button */}
              <button
                onClick={onEndCall}
                className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-lg active:scale-95 shadow-rose-600/30 flex items-center justify-center"
                title={callDirection === "outgoing" ? "Cancel Call" : "End Call"}
              >
                <PhoneOff size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioCall;
