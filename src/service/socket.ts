import { io } from 'socket.io-client';
import { BACKEND_URL } from '../constants';

// When the frontend is hosted statically (e.g. Netlify) without a separate
// VITE_BACKEND_URL, the same-origin SPA redirect serves index.html for the
// socket.io handshake path. socket.io-client interprets that HTML response as
// "server error" — a misleading message for what is actually a missing backend.
// Detect this scenario and skip auto-connect so the UI can show a clear cause.
const ENV_BACKEND_URL = (process.env.VITE_BACKEND_URL || '').trim();
const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname);
const isStaticHostWithoutBackend = isBrowser && !ENV_BACKEND_URL && !isLocalHost;

export const socketBackendMissing = isStaticHostWithoutBackend;

export const socket = io(BACKEND_URL, {
  autoConnect: !isStaticHostWithoutBackend,
  reconnection: !isStaticHostWithoutBackend,
  reconnectionAttempts: 5,
  timeout: 8000,
});

socket.on('connect_error', (err) => {
  console.warn('[SOCKET] connect_error:', err?.message || err);
});
