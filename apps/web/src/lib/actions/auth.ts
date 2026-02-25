'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function login(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signup(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' };
  }

  if (password !== confirmPassword) {
    return { error: '비밀번호가 일치하지 않습니다.' };
  }

  if (password.length < 6) {
    return { error: '비밀번호는 6자 이상이어야 합니다.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // 이메일 확인이 꺼져 있으면 세션이 즉시 생성됨 → 대시보드로
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  // 이메일 확인이 필요한 경우 → 클라이언트에서 안내 UI 표시
  return { error: '__EMAIL_CONFIRM__' };
}

export async function logout(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
