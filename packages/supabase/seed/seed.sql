-- Seed data for local development
-- supabase db reset 실행 시 자동 적용
-- 로그인: test@subtrack.dev / testpassword123

-- 테스트 유저 생성 (Supabase local에서만 작동)
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'test@subtrack.dev',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

-- 구독 데이터
insert into public.subscriptions (user_id, service_name, plan_name, monthly_cost, currency, billing_day, total_credits, remaining_credits, credit_unit, data_source)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Claude API', 'Build Plan', 5.00, 'USD', 1, 1000000, 750000, 'tokens', 'api'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'OpenAI', 'Pay-as-you-go', 20.00, 'USD', 15, 5000000, 3200000, 'tokens', 'api'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ElevenLabs', 'Starter', 5.00, 'USD', 10, 30000, 18000, 'characters', 'api'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Suno', 'Pro', 10.00, 'USD', 5, 500, 320, 'credits', 'extension'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Midjourney', 'Basic', 10.00, 'USD', 20, 200, 145, 'generations', 'extension'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Meshy AI', 'Pro', 20.00, 'USD', 1, 500, 400, 'credits', 'extension');

-- 크레딧 이력 데이터 (최근 7일치)
-- Claude API 사용 추이
insert into public.credit_logs (subscription_id, remaining_credits, used_credits, collected_at, source)
select
  s.id,
  750000 + (g.n * 35000),
  35000,
  now() - (interval '1 day' * g.n),
  'api'
from public.subscriptions s,
     generate_series(0, 6) as g(n)
where s.service_name = 'Claude API'
  and s.user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- OpenAI 사용 추이
insert into public.credit_logs (subscription_id, remaining_credits, used_credits, collected_at, source)
select
  s.id,
  3200000 + (g.n * 120000),
  120000,
  now() - (interval '1 day' * g.n),
  'api'
from public.subscriptions s,
     generate_series(0, 6) as g(n)
where s.service_name = 'OpenAI'
  and s.user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ElevenLabs 사용 추이
insert into public.credit_logs (subscription_id, remaining_credits, used_credits, collected_at, source)
select
  s.id,
  18000 + (g.n * 1500),
  1500,
  now() - (interval '1 day' * g.n),
  'api'
from public.subscriptions s,
     generate_series(0, 6) as g(n)
where s.service_name = 'ElevenLabs'
  and s.user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Suno 사용 추이
insert into public.credit_logs (subscription_id, remaining_credits, used_credits, collected_at, source)
select
  s.id,
  320 + (g.n * 25),
  25,
  now() - (interval '1 day' * g.n),
  'extension'
from public.subscriptions s,
     generate_series(0, 6) as g(n)
where s.service_name = 'Suno'
  and s.user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
