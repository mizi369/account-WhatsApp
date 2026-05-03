import { io, Socket } from 'socket.io-client';
import { BACKEND_URL, IS_BACKEND_AVAILABLE } from '../constants';

// When the deploy is static-only (no Socket.IO server reachable), avoid burning
// reconnection attempts forever. The socket instance still exists so consumers
// can call .on/.emit safely; it just never auto-connects.
export const socket: Socket = io(BACKEND_URL, {
  autoConnect: IS_BACKEND_AVAILABLE,
  reconnection: IS_BACKEND_AVAILABLE,
  reconnectionAttempts: IS_BACKEND_AVAILABLE ? Infinity : 0,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  transports: ['websocket', 'polling'],
  timeout: 30000,
  withCredentials: false,
});

if (!IS_BACKEND_AVAILABLE) {
  console.info('[SOCKET] Skipping connection — running in cloud-only mode (no live backend configured).');
}
