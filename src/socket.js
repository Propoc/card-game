import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";

// Create a socket wrapper that can be updated
class SocketWrapper {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.init();
  }

  init() {
    this.socket = io(SERVER_URL, {
      autoConnect: true,
      timeout: 1000,
    });

    this.setupFallback();
    this.reattachListeners();
  }

  setupFallback() {
    this.socket.on('connect_error', () => {
      if (!SERVER_URL.includes('localhost')) {
        console.log('Connection failed to:', SERVER_URL);
        console.log('Attempting fallback to localhost...');
        
        // Clean up old socket
        this.socket.off();
        this.socket.disconnect();

        // Create new socket with localhost
        this.socket = io('http://localhost:4000', { autoConnect: true });
        this.reattachListeners();
      }
    });
  }

  reattachListeners() {
    // Reattach all stored listeners to the new socket
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }

  on(event, handler) {
    // Store the listener for reattachment
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    
    // Attach to current socket
    this.socket.on(event, handler);
  }

  off(event, handler) {
    if (handler) {
      // Remove specific handler
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(handler);
      }
      this.socket.off(event, handler);
    } else {
      // Remove all handlers for event
      this.listeners.delete(event);
      this.socket.off(event);
    }
  }

  emit(...args) {
    return this.socket.emit(...args);
  }

  disconnect() {
    this.socket.disconnect();
  }

  get id() {
    return this.socket.id;
  }

  get connected() {
    return this.socket.connected;
  }
}

export const socket = new SocketWrapper();