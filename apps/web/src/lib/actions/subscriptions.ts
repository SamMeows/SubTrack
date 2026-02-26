'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function validateFormData(formData: FormData) {
  const serviceName = formData.get('service_name') as string;
  const billingType = (formData.get('billing_type') as string) || 'recurring';
  const cardLast4 = formData.get('payment_card_last4') as string | null;

  const errors: string[] = [];

  if (!serviceName?.trim()) errors.push('서비스명은 필수입니다.');
  if (cardLast4 && cardLast4.length !== 4)
    errors.push('카드 끝 4자리를 정확히 입력해주세요.');

  if (billingType === 'recurring') {
    const monthlyCost = parseFloat(formData.get('monthly_cost') as string);
    const billingDay = parseInt(formData.get('billing_day') as string, 10);
    if (isNaN(monthlyCost) || monthlyCost < 0)
      errors.push('월 결제금액이 올바르지 않습니다.');
    if (isNaN(billingDay) || billingDay < 1 || billingDay > 31)
      errors.push('결제일은 1~31 사이여야 합니다.');
  }

  return errors;
}

function extractFields(formData: FormData) {
  const billingType = (formData.get('billing_type') as string) || 'recurring';
  const totalCredits = formData.get('total_credits') as string;
  const remainingCredits = formData.get('remaining_credits') as string;
  const monthlyCostStr = formData.get('monthly_cost') as string;
  const billingDayStr = formData.get('billing_day') as string;

  return {
    service_name: (formData.get('service_name') as string).trim(),
    plan_name: (formData.get('plan_name') as string)?.trim() || null,
    login_email: (formData.get('login_email') as string)?.trim() || null,
    payment_card_last4:
      (formData.get('payment_card_last4') as string)?.trim() || null,
    card_nickname:
      (formData.get('card_nickname') as string)?.trim() || null,
    billing_type: billingType,
    monthly_cost:
      billingType === 'prepaid'
        ? monthlyCostStr ? parseFloat(monthlyCostStr) : null
        : parseFloat(monthlyCostStr),
    currency: (formData.get('currency') as string) || 'USD',
    billing_day:
      billingType === 'prepaid'
        ? billingDayStr ? parseInt(billingDayStr, 10) : null
        : parseInt(billingDayStr, 10),
    total_credits: totalCredits ? parseFloat(totalCredits) : null,
    remaining_credits: remainingCredits ? parseFloat(remainingCredits) : null,
    credit_unit: (formData.get('credit_unit') as string)?.trim() || null,
    data_source: (formData.get('data_source') as string) || 'manual',
  };
}

export async function createSubscription(
  formData: FormData,
): Promise<{ error?: string }> {
  const errors = validateFormData(formData);
  if (errors.length > 0) return { error: errors[0] };

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: '인증이 필요합니다.' };

  const fields = extractFields(formData);

  const { error } = await supabase.from('subscriptions').insert({
    ...fields,
    user_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/subscriptions');
  redirect('/subscriptions');
}

export async function updateSubscription(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const errors = validateFormData(formData);
  if (errors.length > 0) return { error: errors[0] };

  const supabase = createServerSupabaseClient();
  const fields = extractFields(formData);

  const { error } = await supabase
    .from('subscriptions')
    .update(fields)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/subscriptions');
  revalidatePath(`/subscriptions/${id}`);
  redirect(`/subscriptions/${id}`);
}

export async function deleteSubscription(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('subscriptions').delete().eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/subscriptions');
  redirect('/subscriptions');
}

export async function toggleSubscriptionActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/subscriptions');
  revalidatePath(`/subscriptions/${id}`);
  return {};
}
