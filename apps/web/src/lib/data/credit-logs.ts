import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateCreditPercentage } from '@subtrack/shared';
import type { CreditLog, Subscription } from '@subtrack/shared';

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

export interface CreditSummaryItem {
  subscriptionId: string;
  serviceName: string;
  totalCredits: number;
  remainingCredits: number;
  creditUnit: string;
  percentRemaining: number;
}

export async function getCreditSummary(): Promise<CreditSummaryItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, service_name, total_credits, remaining_credits, credit_unit')
    .eq('is_active', true)
    .not('total_credits', 'is', null);

  if (error) throw error;

  return ((data ?? []) as Pick<
    Subscription,
    'id' | 'service_name' | 'total_credits' | 'remaining_credits' | 'credit_unit'
  >[])
    .filter((s) => s.total_credits != null && s.total_credits > 0)
    .map((s) => ({
      subscriptionId: s.id,
      serviceName: s.service_name,
      totalCredits: s.total_credits!,
      remainingCredits: s.remaining_credits ?? 0,
      creditUnit: s.credit_unit ?? 'credits',
      percentRemaining: calculateCreditPercentage(s.remaining_credits, s.total_credits),
    }));
}
