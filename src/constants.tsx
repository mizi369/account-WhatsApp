
import React from 'react';

// Resolve backend target. Priority:
// 1. Explicit VITE_BACKEND_URL env var (when the user runs a real Express + Socket.IO backend somewhere)
// 2. Same origin as the frontend (works for full-stack deploys / `netlify dev` / `npm run dev`)
// On a static-only host (e.g. plain Netlify deploy) there is no Socket.IO server at the origin,
// so we mark the backend as unavailable and let the UI run in cloud-only mode without alarming
// "System Offline" indicators.
const env: any = (import.meta as any)?.env || {};
const explicitBackend: string = (env.VITE_BACKEND_URL || '').toString().trim();

const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : '';
const isStaticHost = /\.netlify\.app$/i.test(hostname) || /\.vercel\.app$/i.test(hostname);

export const BACKEND_URL = explicitBackend || (isBrowser ? window.location.origin : '');

// True only when we believe a backend (Socket.IO + REST) is reachable at BACKEND_URL.
// When false, socket connection is skipped and the offline overlay is suppressed.
export const IS_BACKEND_AVAILABLE: boolean = Boolean(explicitBackend) || (isBrowser && !isStaticHost);

console.log(`[SYSTEM] Backend Target: ${BACKEND_URL || '(none)'} | Available: ${IS_BACKEND_AVAILABLE}`);

export const COLORS = {
  primary: '#D32F2F', // Red
  secondary: '#00BCD4', // Cyan
  dark: '#0F172A', // Deep Professional Black
  blue: '#2563EB', // Professional Blue
  success: '#10B981',
  warning: '#F59E0B'
};

export const TIME_SLOTS = [
  '9:00 AM – 11:00 AM',
  '11:00 AM – 1:00 PM',
  '1:00 PM – 3:00 PM',
  '3:00 PM – 5:00 PM',
  '5:00 PM – 7:00 PM',
  '7:00 PM – 9:00 PM',
];

export const TEAMS = ['Team A', 'Team B', 'Team C'];

export const SERVICE_PRICES = [
  // AIRCOND SERVICE (WALLMOUNTED) - NORMAL
  { id: 'anw-1.0', category: 'Aircond (Wall)', name: 'Normal Service (1.0HP)', unit: '1hp', price: 100 },
  { id: 'anw-1.5', category: 'Aircond (Wall)', name: 'Normal Service (1.5HP)', unit: '1.5hp', price: 100 },
  { id: 'anw-2.0', category: 'Aircond (Wall)', name: 'Normal Service (2.0HP)', unit: '2hp', price: 120 },
  { id: 'anw-2.5', category: 'Aircond (Wall)', name: 'Normal Service (2.5HP)', unit: '2.5hp', price: 120 },
  { id: 'anw-3.0', category: 'Aircond (Wall)', name: 'Normal Service (3.0HP)', unit: '3hp', price: 150 },
  
  // AIRCOND SERVICE (WALLMOUNTED) - CHEMICAL OVERHAUL
  { id: 'acw-1.0', category: 'Aircond (Wall)', name: 'Chemical Overhaul (1.0HP)', unit: '1hp', price: 180 },
  { id: 'acw-1.5', category: 'Aircond (Wall)', name: 'Chemical Overhaul (1.5HP)', unit: '1.5hp', price: 195 },
  { id: 'acw-2.0', category: 'Aircond (Wall)', name: 'Chemical Overhaul (2.0HP)', unit: '2hp', price: 215 },
  { id: 'acw-2.5', category: 'Aircond (Wall)', name: 'Chemical Overhaul (2.5HP)', unit: '2.5hp', price: 235 },
  { id: 'acw-3.0', category: 'Aircond (Wall)', name: 'Chemical Overhaul (3.0HP)', unit: '3hp', price: 255 },

  // AIRCOND SERVICE (CEILING CASSETTE) - NORMAL
  { id: 'anc-2.0', category: 'Aircond (Ceiling)', name: 'Normal Service (2.0HP)', unit: '2hp', price: 150 },
  { id: 'anc-2.5', category: 'Aircond (Ceiling)', name: 'Normal Service (2.5HP)', unit: '2.5hp', price: 180 },
  { id: 'anc-3.0', category: 'Aircond (Ceiling)', name: 'Normal Service (3.0HP)', unit: '3hp', price: 200 },
  { id: 'anc-3.5', category: 'Aircond (Ceiling)', name: 'Normal Service (3.5HP)', unit: '3.5hp', price: 230 },
  { id: 'anc-4.0', category: 'Aircond (Ceiling)', name: 'Normal Service (4.0HP)', unit: '4hp', price: 250 },
  { id: 'anc-4.5', category: 'Aircond (Ceiling)', name: 'Normal Service (4.5HP)', unit: '4.5hp', price: 280 },
  { id: 'anc-5.0', category: 'Aircond (Ceiling)', name: 'Normal Service (5.0HP)', unit: '5hp', price: 300 },

  // AIRCOND SERVICE (CEILING CASSETTE) - CHEMICAL CANVAS
  { id: 'acc-2.0', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (2.0HP)', unit: '2hp', price: 450 },
  { id: 'acc-2.5', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (2.5HP)', unit: '2.5hp', price: 500 },
  { id: 'acc-3.0', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (3.0HP)', unit: '3hp', price: 550 },
  { id: 'acc-3.5', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (3.5HP)', unit: '3.5hp', price: 600 },
  { id: 'acc-4.0', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (4.0HP)', unit: '4hp', price: 650 },
  { id: 'acc-4.5', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (4.5HP)', unit: '4.5hp', price: 700 },
  { id: 'acc-5.0', category: 'Aircond (Ceiling)', name: 'Chemical Canvas (5.0HP)', unit: '5hp', price: 800 },

  // INSTALLATION (BASIC BACK TO BACK)
  { id: 'ib-1.0', category: 'Installation (Basic)', name: 'Aircond Install (1.0HP)', unit: '1hp', price: 350 },
  { id: 'ib-1.5', category: 'Installation (Basic)', name: 'Aircond Install (1.5HP)', unit: '1.5hp', price: 400 },
  { id: 'ib-2.0', category: 'Installation (Basic)', name: 'Aircond Install (2.0HP)', unit: '2hp', price: 500 },
  { id: 'ib-2.5', category: 'Installation (Basic)', name: 'Aircond Install (2.5HP)', unit: '2.5hp', price: 600 },
  { id: 'ib-3.0', category: 'Installation (Basic)', name: 'Aircond Install (3.0HP)', unit: '3hp', price: 800 },

  // INSTALLATION (PREMIUM)
  { id: 'ip-1.0', category: 'Installation (Premium)', name: 'Aircond Install (1.0HP)', unit: '1hp', price: 700 },
  { id: 'ip-1.5', category: 'Installation (Premium)', name: 'Aircond Install (1.5HP)', unit: '1.5hp', price: 750 },
  { id: 'ip-2.0', category: 'Installation (Premium)', name: 'Aircond Install (2.0HP)', unit: '2hp', price: 850 },
  { id: 'ip-2.5', category: 'Installation (Premium)', name: 'Aircond Install (2.5HP)', unit: '2.5hp', price: 950 },
  { id: 'ip-3.0', category: 'Installation (Premium)', name: 'Aircond Install (3.0HP)', unit: '3hp', price: 1150 },

  // DISMANTLE
  { id: 'd-1.0', category: 'Dismantle', name: 'Buka Aircond (1.0HP)', unit: '1hp', price: 175 },
  { id: 'd-1.5', category: 'Dismantle', name: 'Buka Aircond (1.5HP)', unit: '1.5hp', price: 200 },
  { id: 'd-2.0', category: 'Dismantle', name: 'Buka Aircond (2.0HP)', unit: '2hp', price: 250 },
  { id: 'd-2.5', category: 'Dismantle', name: 'Buka Aircond (2.5HP)', unit: '2.5hp', price: 300 },
  { id: 'd-3.0', category: 'Dismantle', name: 'Buka Aircond (3.0HP)', unit: '3hp', price: 400 },

  // OTHERS
  { id: 'check', category: 'Services', name: 'Checking Service', unit: 'unit', price: 80 },
  { id: 'gas-r22', category: 'Gas', name: 'Topup Gas R22', unit: '10psi', price: 13 },
  { id: 'gas-r410', category: 'Gas', name: 'Topup Gas R410', unit: '10psi', price: 15 },
  { id: 'gas-r32', category: 'Gas', name: 'Topup Gas R32', unit: '10psi', price: 17 },
  { id: 'lamp-b', category: 'Installation', name: 'Pasang Lampu (Basic)', unit: 'unit', price: 45 },
  { id: 'lamp-p', category: 'Installation', name: 'Pasang Lampu (Premium)', unit: 'unit', price: 200 },
  { id: 'fan-b', category: 'Installation', name: 'Pasang Kipas (Basic)', unit: 'unit', price: 180 },
  { id: 'fan-p', category: 'Installation', name: 'Pasang Kipas (Premium)', unit: 'unit', price: 230 },
  { id: 'wh-b', category: 'Installation', name: 'Water Heater (Basic)', unit: 'unit', price: 180 },
  { id: 'wh-p', category: 'Installation', name: 'Water Heater (Premium)', unit: 'unit', price: 546 },
  { id: 'hack', category: 'Others', name: 'Hacking/Tanam Paip', unit: 'ft', price: 45 },
  { id: 'transport', category: 'Others', name: 'Transport/Caj Perjalanan', unit: 'trip', price: 80 },
];

export const EPF_RATES = {
  employee: 0.11,
  employer: 0.13,
};

export const SOCSO_RATES = {
  employee: 0.005,
  employer: 0.0175,
};

export const LOGO_URL = 'https://placehold.co/200x200/00BCD4/ffffff?text=MNF';
