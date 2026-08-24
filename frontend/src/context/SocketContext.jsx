import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import { setSocketInstance } from '../sockets/socket.js';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user, token: authToken } = useSelector((state) => state.auth);
  const socketRef = useRef(null);
  const userId = user?._id;
  const token = authToken || localStorage.getItem("token");

  useEffect(() => {
    let socketConn;
    let timeoutId;
    let cancelled = false;

    if (userId && token) {
      const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const connectSocket = () => {
        if (cancelled) {
          return;
        }

        socketConn = io(socketUrl, {
          auth: {
            token,
          },
          transports: ["websocket", "polling"],
        });

        socketRef.current = socketConn;
        setSocket(socketConn);
        setSocketInstance(socketConn);

        socketConn.on("getOnlineUsers", (users) => {
          setOnlineUsers(users);
        });

        socketConn.on('connect_error', (error) => {
          console.warn('Socket connect error:', error);
        });

        socketConn.on('disconnect', (reason) => {
          console.warn('Socket disconnected:', reason);
        });
      };

      // Delay connection slightly to avoid strict mode double-invoke issue
      timeoutId = setTimeout(connectSocket, 10);

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
        if (socketConn) {
          try {
            socketConn.close();
          } catch (closeError) {
            console.warn('Error closing socket connection:', closeError);
          }
        }
        if (socketRef.current === socketConn) {
          socketRef.current = null;
        }
        setSocket(null);
        setSocketInstance(null);
      };
    }

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (closeError) {
        console.warn('Error closing socket connection:', closeError);
      } finally {
        socketRef.current = null;
        setSocket(null);
        setSocketInstance(null);
      }
    }

    return undefined;
  }, [userId, token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
