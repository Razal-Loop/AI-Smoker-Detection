import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

let socket = null;

export const connectSocket = () => {
  if (socket) return socket;

  const url = getSocketUrl();
  console.log('[Socket] Connecting to:', url);

  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected with ID:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection Error:', error.message);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) return connectSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitFrame = (cameraId, base64Image) => {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('frame', { cameraId, image: base64Image });
    return true;
  }
  return false;
};
