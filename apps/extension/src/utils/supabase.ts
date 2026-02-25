import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@subtrack/shared';
import { getSettings } from './storage';

let client: SupabaseClient<Database> | null = null;
let cachedUrl = '';
let cachedKey = '';
let cachedToken = '';

/**
 * Extension용 Supabase 클라이언트.
 * storage에서 credentials를 읽어 생성하며, 변경 시 invalidate 필요.
 */
export async function getSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  const settings = await getSettings();
  if (!settings.supabase_url || !settings.supabase_anon_key) {
    return null;
  }

  // credentials 변경 시 클라이언트 재생성
  const changed =
    settings.supabase_url !== cachedUrl ||
    settings.supabase_anon_key !== cachedKey ||
    settings.user_access_token !== cachedToken;

  if (!client || changed) {
    cachedUrl = settings.supabase_url;
    cachedKey = settings.supabase_anon_key;
    cachedToken = settings.user_access_token;

    client = createClient<Database>(cachedUrl, cachedKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: cachedToken
          ? { Authorization: `Bearer ${cachedToken}` }
          : {},
      },
    });
  }

  return client;
}

export function invalidateClient(): void {
  client = null;
  cachedUrl = '';
  cachedKey = '';
  cachedToken = '';
}
