-- 결제 유형: recurring(정기 결제) / prepaid(선불 충전)
ALTER TABLE public.subscriptions
  ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'recurring'
  CHECK (billing_type IN ('recurring', 'prepaid'));

-- 카드 별명: "신한 체크", "토스카드" 등
ALTER TABLE public.subscriptions
  ADD COLUMN card_nickname TEXT;

-- 선불 서비스는 결제일이 없을 수 있으므로 NOT NULL 제거
ALTER TABLE public.subscriptions
  ALTER COLUMN billing_day DROP NOT NULL;

-- 기존 CHECK 제약 변경: NULL 허용
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_day_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_day_check
  CHECK (billing_day IS NULL OR (billing_day BETWEEN 1 AND 31));

-- 선불 서비스는 월 금액이 없을 수 있으므로 NOT NULL 제거
ALTER TABLE public.subscriptions
  ALTER COLUMN monthly_cost DROP NOT NULL;
ALTER TABLE public.subscriptions
  ALTER COLUMN monthly_cost SET DEFAULT NULL;

-- 결제 유형별 조회 인덱스
CREATE INDEX idx_subscriptions_billing_type ON public.subscriptions(billing_type);
