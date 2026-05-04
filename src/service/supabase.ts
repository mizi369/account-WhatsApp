
import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval for browser environments
const getEnv = (key: string, fallback: string = '') => {
  try {
    // 1. Try Vite's import.meta.env
    const viteKey = `VITE_${key}`;
    if (import.meta.env[viteKey]) return import.meta.env[viteKey];
    if (import.meta.env[key]) return import.meta.env[key];

    // 2. Try the defined process.env (Vite will replace these at build time)
    if (key === 'SUPABASE_URL') return (process.env as any).SUPABASE_URL || 'https://scnbjrkwrgshihgnixvu.supabase.co';
    if (key === 'SUPABASE_KEY') return (process.env as any).SUPABASE_KEY || fallback;
    
    return fallback;
  } catch (e) {
    if (key === 'SUPABASE_URL') return 'https://scnbjrkwrgshihgnixvu.supabase.co';
    return fallback;
  }
};

let supabaseUrl = '';
let supabaseKey = '';

try {
  supabaseUrl = localStorage.getItem('mnf_supabase_url') || getEnv('SUPABASE_URL');
  supabaseKey = localStorage.getItem('mnf_supabase_key') || getEnv('SUPABASE_KEY');
} catch (e) {
  console.warn('[SUPABASE] Could not access localStorage or Env variables:', e);
  supabaseUrl = getEnv('SUPABASE_URL');
  supabaseKey = getEnv('SUPABASE_KEY');
}

let client: any;

// Helper to create a dummy chainable object for missing credentials
// This prevents "Cannot read properties of undefined" errors in db.ts
const createMockBuilder = () => {
    const mockResponse = { data: null, error: { message: 'Supabase not configured' } };
    
    // Create a chainable builder that mimics Supabase query builder
    const mockBuilder: any = {
        select: async () => mockResponse,
        eq: () => mockBuilder,
        single: () => mockBuilder,
        order: () => mockBuilder,
        limit: () => mockBuilder,
        // Make it thenable so it can be awaited directly
        then: (resolve: any) => resolve(mockResponse)
    };

    return {
        select: async () => ({ data: [], error: { message: 'Supabase not configured (Missing URL/Key)' } }),
        insert: () => mockBuilder,
        update: () => mockBuilder,
        delete: () => mockBuilder,
        upsert: () => mockBuilder
    };
};

// Check for valid credentials (ignoring placeholder if present)
const isValidKey = supabaseKey && !supabaseKey.includes('PASTE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !isValidKey) {
    // Warning suppressed as requested
    // console.warn('[SUPABASE] Running in Offline/Cache Mode. (Missing valid URL or Key)');
    client = {
        from: () => createMockBuilder(),
        isConfigured: false
    };
} else {
    try {
        client = createClient(supabaseUrl, supabaseKey);
        (client as any).isConfigured = true;
    } catch (e) {
        console.error('[SUPABASE] Client initialization failed:', e);
        client = {
            from: () => createMockBuilder(),
            isConfigured: false
        };
    }
}

export const supabase = client;
