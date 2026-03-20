import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateCreditPercentage } from '@subtrack/shared';
import type { CreditLog, CreditGrant, Subscription, Currency } from '@subtrack/shared';

export async function getCreditLogs(
  subscriptionId: string,
  range?: { from: string; to: string },
): Promise<CreditLog[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('credit_logs')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('collected_at', { ascending: true });

  if (range) {
    query = query.gte('collected_at', range.from).lte('collected_at', range.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CreditLog[];
}

/**
 * 특정 구독 ID 목록의 최신 credit_log remaining 값을 가져옴
 * 구독별 최신 1건만 조회하여 전체 테이블 스캔을 방지
 */
export async function getLatestCredits(
  subscriptionIds: string[],
): Promise<Map<string, number>> {
  if (subscriptionIds.length === 0) return new Map();

  const supabase = createServerSupabaseClient();
  const map = new Map<string, number>();

  // 구독별 최신 credit_log 1건만 조회 (병렬)
  const results = await Promise.all(
    subscriptionIds.map((id) =>
      supabase
        .from('credit_logs')
        .select('subscription_id, remaining_credits')
        .eq('subscription_id', id)
        .order('collected_at', { ascending: false })
        .limit(1),
    ),
  );

  for (const { data, error } of results) {
    if (error || !data?.length) continue;
    map.set(data[0].subscription_id, data[0].remaining_credits);
  }

  return map;
}

export interface CreditSummaryItem {
  subscriptionId: string;
  serviceName: string;
  totalCredits: number;
  remainingCredits: number;
  creditUnit: string | null;
  currency: Currency;
  percentRemaining: number;
  billingType: 'recurring' | 'prepaid';
}

export async function getCreditSummary(): Promise<CreditSummaryItem[]> {
  const supabase = createServerSupabaseClient();

  // 활성 구독 조회 후, 해당 구독들의 최신 credit_log 조회
  const subsResult = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true);

  if (subsResult.error) throw subsResult.error;

  const subscriptionIds = (subsResult.data ?? []).map((s: any) => s.id as string);
  const latestCredits = await getLatestCredits(subscriptionIds);

  type Row = Pick<
    Subscription,
    'id' | 'service_name' | 'total_credits' | 'remaining_credits' | 'credit_unit' | 'currency'
  > & { billing_type?: string };

  return ((subsResult.data ?? []) as Row[])
    .filter((s) => {
      const billingType = s.billing_type ?? 'recurring';
      if (billingType === 'prepaid') {
        // 선불: credit_log 또는 remaining_credits 중 하나라도 있으면 표시
        return latestCredits.has(s.id) || s.remaining_credits != null;
      }
      // 정기: total_credits > 0 필요 (비율 계산용)
      return s.total_credits != null && s.total_credits > 0;
    })
    .map((s) => {
      // credit_log 최신값 우선, 없으면 subscription 테이블 값
      const remaining = latestCredits.get(s.id) ?? s.remaining_credits ?? 0;

      return {
        subscriptionId: s.id,
        serviceName: s.service_name,
        totalCredits: s.total_credits ?? 0,
        remainingCredits: remaining,
        creditUnit: s.credit_unit ?? null,
        currency: s.currency,
        percentRemaining: calculateCreditPercentage(remaining, s.total_credits),
        billingType: (s.billing_type ?? 'recurring') as 'recurring' | 'prepaid',
      };
    });
}

/**
 * 특정 구독의 크레딧 배치(grant) 목록 조회
 */
export async function getCreditGrants(subscriptionId: string): Promise<CreditGrant[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('credit_grants')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('effective_at', { ascending: false, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as CreditGrant[];
}

/** 만료 임박 grant 정보 (대시보드용) */
export interface ExpiringGrantInfo {
  subscriptionId: string;
  serviceName: string;
  grants: {
    remainingAmount: number;
    expiresAt: string;
    daysUntilExpiry: number;
  }[];
  totalExpiringAmount: number;
  currency: Currency;
}

/**
 * 모든 활성 구독에서 N일 이내 만료되는 grant를 조회
 */
export async function getExpiringGrants(withinDays = 30): Promise<ExpiringGrantInfo[]> {
  const supabase = createServerSupabaseClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + withinDays);

  // 활성 구독 + 만료 임박 grants 조회
  const [subsResult, grantsResult] = await Promise.all([
    supabase.from('subscriptions').select('id, service_name, currency').eq('is_active', true),
    supabase
      .from('credit_grants')
      .select('*')
      .gt('remaining_amount', 0)
      .not('expires_at', 'is', null)
      .lte('expires_at', cutoffDate.toISOString())
      .order('expires_at', { ascending: true }),
  ]);

  if (subsResult.error) throw subsResult.error;
  if (grantsResult.error) throw grantsResult.error;

  const subsMap = new Map<string, { serviceName: string; currency: Currency }>();
  for (const s of subsResult.data ?? []) {
    subsMap.set(s.id, { serviceName: s.service_name, currency: s.currency });
  }

  const now = Date.now();
  const grouped = new Map<string, ExpiringGrantInfo>();

  for (const grant of (grantsResult.data ?? []) as CreditGrant[]) {
    const sub = subsMap.get(grant.subscription_id);
    if (!sub || !grant.expires_at) continue;

    const daysUntilExpiry = Math.ceil(
      (new Date(grant.expires_at).getTime() - now) / (1000 * 60 * 60 * 24),
    );

    if (!grouped.has(grant.subscription_id)) {
      grouped.set(grant.subscription_id, {
        subscriptionId: grant.subscription_id,
        serviceName: sub.serviceName,
        grants: [],
        totalExpiringAmount: 0,
        currency: sub.currency,
      });
    }

    const info = grouped.get(grant.subscription_id)!;
    info.grants.push({
      remainingAmount: grant.remaining_amount,
      expiresAt: grant.expires_at,
      daysUntilExpiry,
    });
    info.totalExpiringAmount += grant.remaining_amount;
  }

  return Array.from(grouped.values());
}
