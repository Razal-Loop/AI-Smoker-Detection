// Socket.io service - URL from src/config/api.js (env-aware for production)
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = getSocketUrl();
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 30,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

export const sendFrame = (cameraId, imageBase64) => {
  const socket = getSocket();
  if (socket?.connected) {
    socket.emit('frame', { cameraId, image: imageBase64 });
  } else {
    console.warn('Socket not connected, cannot send frame');
  }
};

export const onDetection = (callback) => {
  const socket = getSocket();
  socket.on('detection', callback);
  return () => socket.off('detection', callback);
};

export const onDetectionResult = (callback) => {
  const socket = getSocket();
  socket.on('detection_result', callback);
  return () => socket.off('detection_result', callback);
};

export const onDetectionError = (callback) => {
  const socket = getSocket();
  socket.on('detection_error', callback);
  return () => socket.off('detection_error', callback);
};





