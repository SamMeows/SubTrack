-- SubTrack AI: Initial Database Schema
-- Phase 1 MVP

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- subscriptions: 구독 서비스 정보
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_name text not null,
  plan_name text,
  login_email text,
  payment_card_last4 text check (char_length(payment_card_last4) = 4),
  monthly_cost numeric(10, 2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD', 'KRW', 'EUR', 'JPY')),
  billing_day integer not null check (billing_day between 1 and 31),
  total_credits numeric,
  remaining_credits numeric,
  credit_unit text, -- 'tokens', 'credits', 'characters', 'songs', etc.
  data_source text not null default 'manual' check (data_source in ('api', 'extension', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_billing_day on public.subscriptions(billing_day);

-- ============================================
-- credit_logs: 크레딧 사용 이력
-- ============================================
create table public.credit_logs (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  remaining_credits numeric not null,
  used_credits numeric not null default 0,
  collected_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('api', 'extension', 'manual'))
);

-- 인덱스
create index idx_credit_logs_subscription_id on public.credit_logs(subscription_id);
create index idx_credit_logs_collected_at on public.credit_logs(collected_at desc);

-- ============================================
-- alerts: 알림 설정
-- ============================================
create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  type text not null check (type in ('renewal', 'low_credit')),
  threshold numeric, -- low_credit: 잔여 비율(%) 기준 (예: 20)
  channel text not null default 'email' check (channel in ('email', 'slack')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 인덱스
create index idx_alerts_user_id on public.alerts(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
alter table public.subscriptions enable row level security;
alter table public.credit_logs enable row level security;
alter table public.alerts enable row level security;

-- subscriptions: 자신의 데이터만 CRUD
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

-- credit_logs: 자신의 구독에 속하는 로그만 접근
create policy "Users can view own credit logs"
  on public.credit_logs for select
  using (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = credit_logs.subscription_id
        and subscriptions.user_id = auth.uid()
    )
  );

create policy "Users can insert own credit logs"
  on public.credit_logs for insert
  with check (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = credit_logs.subscription_id
        and subscriptions.user_id = auth.uid()
    )
  );

-- alerts: 자신의 알림만 CRUD
create policy "Users can view own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own alerts"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete own alerts"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();
