import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

function stripEnv(value: string): string {
  return value.replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

// On web with server output, use same-origin proxy to avoid CORS. Set EXPO_PUBLIC_USE_SUPABASE_PROXY=true in .env when using the proxy.
const useProxy =
  typeof window !== 'undefined' && stripEnv(process.env.EXPO_PUBLIC_USE_SUPABASE_PROXY ?? '') === 'true';
const supabaseUrl = useProxy
  ? `${(window as unknown as { location: { origin: string } }).location.origin}/supabase-proxy`
  : stripEnv(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
const supabaseAnonKey = stripEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '');

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);
  throw new Error(
    `Supabase is not configured. Add ${missing.join(' and ')} to your .env file. Restart the dev server after changing .env.`
  );
}

try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `EXPO_PUBLIC_SUPABASE_URL is not a valid URL: "${supabaseUrl}". Check your .env file (remove any extra quotes).`
  );
}

// Use a fetch that works on web and logs failures for debugging
const globalFetch = typeof window !== 'undefined' ? window.fetch : fetch;
const customFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  return globalFetch(input, init).then(
    (res) => res,
    (err) => {
      const msg = err?.message ?? String(err);
      console.error('[Supabase] Request failed:', url.replace(supabaseAnonKey, '***'), msg);
      throw err;
    }
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});

/**
 * Call this to verify the app can reach Supabase (e.g. on login screen load).
 * Returns { ok: true } or { ok: false, error: "message" }.
 */
export async function checkSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  const healthUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`;
  try {
    const res = await globalFetch(healthUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { apikey: supabaseAnonKey, Accept: 'application/json' },
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type UserType = 'resident' | 'business' | 'admin' | 'provider';
export type WasteType = 'Residential' | 'Commercial' | 'Public';
export type OrderStatus = 'Pending' | 'Assigned' | 'Completed' | 'Failed';
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed';
export type PaymentMethod = 'Mobile Money' | 'Card';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  user_type: UserType;
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  contact: string;
  area: string;
  location_lat: number;
  location_lon: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  provider_id?: string;
  pickup_location: string;
  location_lat?: number;
  location_lon?: number;
  waste_type: WasteType;
  pickup_time: string;
  status: OrderStatus;
  cost?: number;
  estimated_kg?: number;
  image_url?: string;
  created_at: string;
  completed_at?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_id?: string;
  created_at: string;
}
