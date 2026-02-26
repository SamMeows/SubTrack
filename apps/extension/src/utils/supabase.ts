import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@subtrack/shared';
import { getSettings, setSetting } from './storage';

let client: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

/**
 * Extension용 Supabase 클라이언트.
 * setSession()으로 세션을 복원하고, 만료 시 refresh_token으로 자동 갱신.
 * 갱신된 토큰은 chrome.storage.local에 저장.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const settings = await getSettings();
  if (!settings.supabase_url || !settings.supabase_anon_key) {
    return null;
  }
  if (!settings.user_access_token) {
    return null;
  }

  // Supabase URL/Key 변경 시 클라이언트 재생성
  const urlOrKeyChanged =
    settings.supabase_url !== cachedUrl ||
    settings.supabase_anon_key !== cachedKey;

  if (!client || urlOrKeyChanged) {
    cachedUrl = settings.supabase_url;
    cachedKey = settings.supabase_anon_key;

    client = createClient(cachedUrl, cachedKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // setSession으로 세션 복원 (만료 시 refresh_token으로 자동 갱신)
  const { data, error } = await client.auth.setSession({
    access_token: settings.user_access_token,
    refresh_token: settings.user_refresh_token || '',
  });

  if (error) {
    // refresh_token이 있으면 수동 갱신 시도
    if (settings.user_refresh_token) {
      console.log('[SubTrack] Access token expired, refreshing...');
      const { data: refreshData, error: refreshError } =
        await client.auth.refreshSession({
          refresh_token: settings.user_refresh_token,
        });

      if (refreshError || !refreshData.session) {
        console.error('[SubTrack] Token refresh failed — please re-login in extension popup:', refreshError?.message);
        // 만료된 토큰 정리
        await setSetting('user_access_token', '');
        await setSetting('user_refresh_token', '');
        return null;
      }

      // 갱신된 토큰 저장
      await setSetting('user_access_token', refreshData.session.access_token);
      await setSetting('user_refresh_token', refreshData.session.refresh_token);
      console.log('[SubTrack] Token refreshed successfully');
      return client;
    }

    console.error('[SubTrack] Session expired and no refresh token — please login in extension popup');
    return null;
  }

  // 토큰이 갱신되었으면 storage에 저장
  if (data.session) {
    if (data.session.access_token !== settings.user_access_token) {
      await setSetting('user_access_token', data.session.access_token);
      console.log('[SubTrack] Access token updated in storage');
    }
    if (
      data.session.refresh_token &&
      data.session.refresh_token !== settings.user_refresh_token
    ) {
      await setSetting('user_refresh_token', data.session.refresh_token);
      console.log('[SubTrack] Refresh token updated in storage');
    }
  }

  return client;
}

export function invalidateClient(): void {
  client = null;
  cachedUrl = '';
  cachedKey = '';
}
