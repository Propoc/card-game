import { io } from "socket.io-client";

const SERVER_URL = window.APP_CONFIG?.SERVER_URL;
console.log('[Socket] SERVER_URL:', SERVER_URL);

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err);
  if (err && err.message) {
    console.error('[Socket] Error message:', err.message);
  }
  if (err && err.stack) {
    console.error('[Socket] Error stack:', err.stack);
  }
});
socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
});

export { socket };