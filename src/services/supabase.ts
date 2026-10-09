import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigParams {
  url: string;
  anonKey: string;
}

const STORAGE_KEY_SUPABASE_CONFIG = 'dnd_soundboard_supabase_config';

export function getStoredSupabaseConfig(): SupabaseConfigParams | null {
  // 1. Check environment variables
  if (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  ) {
    return {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (raw) {
      return JSON.parse(raw) as SupabaseConfigParams;
    }
  } catch (e) {
    console.error('Failed to parse stored Supabase config', e);
  }

  return null;
}

export function saveStoredSupabaseConfig(config: SupabaseConfigParams | null) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_CONFIG);
    currentClient = null;
  } else {
    localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(config));
    currentClient = null;
  }
}

let currentClient: SupabaseClient | null = null;

export function initSupabase(config?: SupabaseConfigParams | null): boolean {
  const conf = config || getStoredSupabaseConfig();
  if (!conf || !conf.url || !conf.anonKey) {
    currentClient = null;
    return false;
  }

  try {
    currentClient = createClient(conf.url, conf.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return true;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    currentClient = null;
    return false;
  }
}

export function getSupabaseInstances() {
  if (!currentClient) {
    initSupabase();
  }
  return {
    client: currentClient,
    isConfigured: !!currentClient,
  };
}
