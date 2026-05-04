
// --- CRITICAL BROWSER SHIMS ---
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { 
    env: {
      NODE_ENV: 'production'
    },
    nextTick: (fn: any) => setTimeout(fn, 0),
    browser: true,
    cwd: () => '/'
  };
} else if (!(window as any).process.env) {
    (window as any).process.env = {};
}

// Global for some legacy libs
(window as any).global = window;

console.log('[SHIM] Process environment initialized.');
export {};
