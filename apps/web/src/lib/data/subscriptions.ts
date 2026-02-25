import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Subscription } from '@subtrack/shared';

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Subscription[];
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as Subscription;
}
