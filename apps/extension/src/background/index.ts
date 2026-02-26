import { getAllParsers } from '../parsers/registry';
import type { CreditData } from '../parsers/types';
import type { Database, ServiceName } from '@subtrack/shared';
import { getSupabaseClient, invalidateClient } from '../utils/supabase';
import { getSettings, setCollectionStatus } from '../utils/storage';
import { notifyCollectionError } from '../utils/notifications';

type CreditLogInsert = Database['public']['Tables']['credit_logs']['Insert'];
type CreditGrantInsert = Database['public']['Tables']['credit_grants']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

// 30분 주기 수집 알람
chrome.alarms.create('collect-credits', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'collect-credits') {
    await collectAllCredits();
  }
});

/** 모든 파서를 순회하며 크레딧 수집 */
async function collectAllCredits(): Promise<void> {
  const parsers = getAllParsers();

  for (const parser of parsers) {
    try {
      const ready = await parser.init();
      if (!ready) {
        await setCollectionStatus(parser.name, {
          status: 'no_auth',
          message: 'No credentials configured',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      await setCollectionStatus(parser.name, {
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

      console.log(`[SubTrack] ${parser.name}: collecting...`);
      const result = await parser.collect();
      console.log(`[SubTrack] ${parser.name}: result =`, result);
      if (result) {
        await saveToSupabase(parser.name, result);
        await setCollectionStatus(parser.name, {
          status: 'success',
          timestamp: new Date().toISOString(),
        });
      } else {
        await setCollectionStatus(parser.name, {
          status: 'fail',
          message: 'Collection returned null',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await setCollectionStatus(parser.name, {
        status: 'fail',
        message: msg,
        timestamp: new Date().toISOString(),
      });
      notifyCollectionError(parser.name, msg);
      console.error(`[SubTrack] ${parser.name} failed:`, error);
    }
  }
}

/** Supabase에 수집 결과 저장 */
async function saveToSupabase(
  serviceName: string,
  data: CreditData,
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.warn(`[SubTrack] ${serviceName}: Supabase not configured, skipping save`);
    return;
  }

  // 해당 서비스의 활성 구독 찾기
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('service_name', serviceName as ServiceName)
    .eq('is_active', true)
    .limit(1);

  if (subError || !subscriptions?.length) {
    console.warn(
      `[SubTrack] ${serviceName}: no active subscription found`,
      subError?.message ?? '',
    );
    return;
  }

  const subscriptionId = subscriptions[0].id;

  // 센티널 값(-1)이 아닌 실제 데이터만 저장
  if (data.remainingCredits >= 0) {
    const logRow: CreditLogInsert = {
      subscription_id: subscriptionId,
      remaining_credits: data.remainingCredits,
      used_credits: data.usedCredits,
      collected_at: data.collectedAt,
      source: 'extension',
    };

    const { error: logError } = await supabase
      .from('credit_logs')
      .insert(logRow);

    if (logError) {
      console.error(`[SubTrack] ${serviceName}: failed to insert credit log:`, logError);
      return;
    }

    // 구독의 remaining_credits 업데이트
    const subUpdate: SubscriptionUpdate = {
      remaining_credits: data.remainingCredits,
    };
    if (data.totalCredits > 0) {
      subUpdate.total_credits = data.totalCredits;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(subUpdate)
      .eq('id', subscriptionId);

    if (updateError) {
      console.error(`[SubTrack] ${serviceName}: failed to update subscription:`, updateError);
    } else {
      console.log(`[SubTrack] ${serviceName}: saved (remaining=${data.remainingCredits})`);
    }
  }

  // 크레딧 배치별 만료 정보 저장 (스냅샷 교체)
  if (data.creditGrants && data.creditGrants.length > 0) {
    // 기존 grants 삭제
    const { error: deleteError } = await supabase
      .from('credit_grants')
      .delete()
      .eq('subscription_id', subscriptionId);

    if (deleteError) {
      console.error(`[SubTrack] ${serviceName}: failed to delete old grants:`, deleteError);
    } else {
      // 새 grants 삽입
      const grantRows: CreditGrantInsert[] = data.creditGrants.map((g) => ({
        subscription_id: subscriptionId,
        grant_id: g.grantId || null,
        grant_amount: g.grantAmount,
        used_amount: g.usedAmount,
        remaining_amount: g.remainingAmount,
        expires_at: g.expiresAt,
        effective_at: g.effectiveAt,
        collected_at: data.collectedAt,
      }));

      const { error: insertError } = await supabase
        .from('credit_grants')
        .insert(grantRows);

      if (insertError) {
        console.error(`[SubTrack] ${serviceName}: failed to insert grants:`, insertError);
      } else {
        console.log(`[SubTrack] ${serviceName}: saved ${grantRows.length} credit grants`);
      }
    }
  }
}

// Popup과의 메시지 통신
console.log('[SubTrack BG] Service worker loaded');
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[SubTrack BG] Message received:', message);
  if (message.type === 'COLLECT_NOW') {
    collectAllCredits().then(() => sendResponse({ success: true }));
    return true; // async sendResponse 유지
  }

  if (message.type === 'GET_STATUS') {
    getSettings().then((settings) => {
      sendResponse({ status: settings.collection_status });
    });
    return true;
  }

  if (message.type === 'SETTINGS_CHANGED') {
    invalidateClient();
    sendResponse({ success: true });
    return true;
  }
});

// Extension 설치/업데이트 시 초기 수집
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SubTrack] Extension installed');
  setTimeout(() => collectAllCredits(), 5000);
});
