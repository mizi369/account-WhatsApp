
import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval for browser environments
const getEnv = (key: string, fallback: string = '') => {
  try {
    // Check both standard VITE_ prefix and direct access
    const viteKey = `VITE_${key}`;
    // @ts-ignore
    const env = import.meta.env || {};
    
    return env[viteKey] || env[key] || (typeof process !== 'undefined' ? process.env[key] : '') || fallback;
  } catch (e) {
    return fallback;
  }
};

let supabaseUrl = '';
let supabaseKey = '';

try {
  supabaseUrl = localStorage.getItem('mnf_supabase_url') || getEnv('SUPABASE_URL');
  supabaseKey = localStorage.getItem('mnf_supabase_key') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY');
} catch (e) {
  console.warn('[SUPABASE] Could not access localStorage or Env variables:', e);
  supabaseUrl = getEnv('SUPABASE_URL');
  supabaseKey = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY');
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

// Helper to check if a string is a valid URL
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Check for valid credentials (ignoring placeholder if present)
const isValidKey = supabaseKey && !supabaseKey.includes('PASTE_SERVICE_ROLE_KEY') && supabaseKey.length > 20;
const hasValidUrl = supabaseUrl && isValidUrl(supabaseUrl);

if (!hasValidUrl || !isValidKey) {
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
