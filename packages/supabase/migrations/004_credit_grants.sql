-- 크레딧 배치별 만료 정보 테이블
-- OpenAI API 등 선불 서비스의 배치별 grant 정보를 저장
-- 매 수집 시 스냅샷 교체 (기존 DELETE → 새 INSERT)

CREATE TABLE IF NOT EXISTS public.credit_grants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  grant_id text,                        -- 서비스에서 부여한 grant 식별자
  grant_amount numeric NOT NULL,        -- 충전 금액
  used_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL,
  expires_at timestamptz,               -- 만료일 (null이면 만료 없음)
  effective_at timestamptz,             -- 크레딧 적용/구매일
  collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_grants_sub_id ON public.credit_grants(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_grants_expires_at ON public.credit_grants(expires_at);

-- RLS
ALTER TABLE public.credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit grants" ON public.credit_grants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE id = credit_grants.subscription_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own credit grants" ON public.credit_grants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE id = credit_grants.subscription_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own credit grants" ON public.credit_grants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE id = credit_grants.subscription_id
        AND user_id = auth.uid()
    )
  );
