import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSocket } from "../../context/SocketContext.jsx";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import toast from "react-hot-toast";

const VideoCall = ({ roomId: propRoomId, onEndCall }) => {
  const { user } = useSelector((state) => state.auth);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const iceCandidateQueue = useRef([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const roomId = propRoomId || searchParams.get("room") || "stackversehub-room";
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) {
      console.log("Socket not available in VideoCall yet...");
      return;
    }

    let isMounted = true;
    remoteStream.current = new MediaStream();

    const init = async () => {
      try {
        // 1. Get Local Stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream.current;
        }

        // 2. Create Peer Connection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        // 3. Add Local Tracks
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // 4. Handle Remote Tracks
        peerConnection.current.ontrack = (event) => {
          console.log("Remote track received:", event.track.kind);
          setIsConnected(true);
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              remoteStream.current.addTrack(track);
            });
          } else {
            remoteStream.current.addTrack(event.track);
          }
        };

        // 5. Handle ICE Candidates
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate,
            });
          }
        };

        peerConnection.current.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnection.current?.connectionState);
          if (peerConnection.current?.connectionState === "connected") {
            setIsConnected(true);
            toast.success("Peer connected successfully!");
          } else if (
            peerConnection.current?.connectionState === "disconnected" ||
            peerConnection.current?.connectionState === "failed"
          ) {
            setIsConnected(false);
            toast.error("Peer disconnected");
          }
        };

        // Join Room
        socket.emit("join-room", roomId);
      } catch (error) {
        console.error("Error accessing media devices:", error);
        toast.error("Could not access camera or microphone");
      }
    };

    init();

    // ==========================================
    // SOCKET EVENT HANDLERS
    // ==========================================

    const handleOtherUserExists = async () => {
      console.log("Other user exists, creating offer...");
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
      console.log("Offer received, creating answer...");
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain ICE candidate queue if any arrived early
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async (answer) => {
      console.log("Answer received, setting remote description...");
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));

        // Drain ICE candidate queue if any arrived early
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIceCandidate = async (candidate) => {
      console.log("ICE candidate received");
      if (!peerConnection.current) return;
      try {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log("Remote description not set yet, queueing ICE candidate");
          iceCandidateQueue.current.push(candidate);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    };

    socket.on("other-user-exists", handleOtherUserExists);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    // Cleanup
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
  }, [socket, roomId]);

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (onEndCall) {
      onEndCall();
    } else {
      const localUser = user || JSON.parse(localStorage.getItem("user") || "{}");
      if (localUser?.role === "instructor") {
        window.location.href = "/instructor/dashboard";
      } else {
        window.location.href = "/student/dashboard";
      }
    }
  };

  const startScreenShare = async () => {
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Get screen track
      const screenTrack = screenStream.getVideoTracks()[0];

      // Find current video sender
      const sender = peerConnection.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      // Replace webcam with screen
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // Show screen locally
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // When user stops screen sharing
      screenTrack.onended = async () => {
        try {
          // Get webcam again
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          const cameraTrack = cameraStream.getVideoTracks()[0];

          // Replace screen with webcam
          if (sender) {
            await sender.replaceTrack(cameraTrack);
          }

          // Show webcam locally
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = cameraStream;
          }
        } catch (err) {
          console.error("Error restarting camera after screen share:", err);
        }
      };
    } catch (error) {
      console.error("Screen Share Error:", error);
    }
  };

  const displayRoleName = user?.role === "instructor" ? "Instructor" : "Student";

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col justify-center items-center bg-slate-950 p-6 overflow-hidden font-sans">
      {/* Background ambient gradients */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 max-w-6xl mx-auto px-6 py-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Users className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">StackVerseHub Live Classroom</h1>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              {isConnected ? "Connected to Peer" : "Waiting for Peer to join..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-700/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Room ID:</span>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">{roomId}</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex flex-col md:flex-row gap-6 justify-center items-center w-full max-w-6xl z-10 mt-20 mb-24">
        {/* Local Video */}
        <div className="relative w-full md:w-1/2 aspect-video bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden group">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-all duration-300 ${isVideoOff ? "opacity-0" : "opacity-100"}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                <VideoOff className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-400">Camera Paused</p>
            </div>
          )}
          <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-bold text-white tracking-wide">You ({displayRoleName})</span>
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative w-full md:w-1/2 aspect-video bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden group">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700 shadow-xl relative">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <Users className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-300 tracking-wide animate-pulse">Waiting for Peer stream...</p>
            </div>
          )}
          <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 flex items-center gap-2 shadow-lg">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
            <span className="text-xs font-bold text-white tracking-wide">{isConnected ? "Connected Peer" : "Remote Stream"}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-20 bg-slate-900/80 backdrop-blur-2xl px-8 py-4 border border-slate-800 rounded-full shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
            isMuted
              ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/30"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/50"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
            isVideoOff
              ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/30"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/50"
          }`}
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button
          onClick={startScreenShare}
          className="px-6 py-4 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/50 transition-all duration-300 flex items-center justify-center shadow-lg text-xs font-bold uppercase tracking-wider"
          title="Share Screen"
        >
          Share Screen
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all duration-300 flex items-center justify-center shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 hover:-translate-y-0.5 active:translate-y-0 ml-2"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
