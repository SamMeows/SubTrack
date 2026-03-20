import { redirect } from 'next/navigation';

// middleware가 미인증 → /login, 인증 → 통과 처리하므로 바로 redirect
export default function Home() {
  redirect('/dashboard');
}
