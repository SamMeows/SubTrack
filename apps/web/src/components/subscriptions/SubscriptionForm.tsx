'use client';

import { useState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { SERVICE_NAMES, SUPPORTED_CURRENCIES } from '@subtrack/shared';
import type { Subscription, BillingType } from '@subtrack/shared';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface SubscriptionFormProps {
  mode: 'create' | 'edit';
  subscription?: Subscription;
  action: (formData: FormData) => Promise<{ error?: string }>;
}

const serviceOptions = [
  ...SERVICE_NAMES.map((name) => ({ value: name, label: name })),
  { value: '__custom__', label: '기타 (직접 입력)' },
];

const currencyOptions = SUPPORTED_CURRENCIES.map((c) => ({
  value: c,
  label: c,
}));

const dataSourceOptions = [
  { value: 'manual', label: '수동 입력' },
  { value: 'api', label: 'API' },
  { value: 'extension', label: 'Chrome Extension' },
];

export function SubscriptionForm({
  mode,
  subscription,
  action,
}: SubscriptionFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>(
    subscription?.billing_type ?? 'recurring',
  );
  const [isCustomService, setIsCustomService] = useState(
    subscription
      ? !SERVICE_NAMES.includes(subscription.service_name as any)
      : false,
  );
  const [customServiceName, setCustomServiceName] = useState(
    subscription && !SERVICE_NAMES.includes(subscription.service_name as any)
      ? subscription.service_name
      : '',
  );

  const isRecurring = billingType === 'recurring';

  async function handleSubmit(formData: FormData) {
    setError('');
    setLoading(true);

    // 커스텀 서비스명 처리
    if (isCustomService) {
      formData.set('service_name', customServiceName);
    }

    try {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 결제 유형 토글 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          결제 유형
        </label>
        <div className="flex rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => setBillingType('recurring')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isRecurring
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            정기 결제
          </button>
          <button
            type="button"
            onClick={() => setBillingType('prepaid')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              !isRecurring
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            선불 충전
          </button>
        </div>
        <input type="hidden" name="billing_type" value={billingType} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 서비스명 */}
        <div>
          <Select
            id="service_name"
            name="service_name"
            label="서비스명"
            options={serviceOptions}
            defaultValue={
              subscription &&
              SERVICE_NAMES.includes(subscription.service_name as any)
                ? subscription.service_name
                : '__custom__'
            }
            onChange={(e) => {
              setIsCustomService(e.target.value === '__custom__');
            }}
          />
          {isCustomService && (
            <input
              type="text"
              value={customServiceName}
              onChange={(e) => setCustomServiceName(e.target.value)}
              placeholder="서비스명 입력"
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          )}
        </div>

        {/* 플랜명 */}
        <Input
          id="plan_name"
          name="plan_name"
          label="플랜명"
          placeholder="예: Pro, Team"
          defaultValue={subscription?.plan_name ?? ''}
        />

        {/* 계정 이메일 */}
        <Input
          id="login_email"
          name="login_email"
          type="email"
          label="계정 이메일"
          placeholder="you@example.com"
          defaultValue={subscription?.login_email ?? ''}
        />

        {/* 데이터 소스 */}
        <Select
          id="data_source"
          name="data_source"
          label="데이터 소스"
          options={dataSourceOptions}
          defaultValue={subscription?.data_source ?? 'manual'}
        />
      </div>

      {/* 결제 카드 정보 */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">결제 카드</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="card_nickname"
            name="card_nickname"
            label="카드 별명"
            placeholder="예: 신한 체크, 토스카드"
            defaultValue={subscription?.card_nickname ?? ''}
          />
          <Input
            id="payment_card_last4"
            name="payment_card_last4"
            label="카드 끝 4자리"
            placeholder="1234"
            maxLength={4}
            pattern="\d{4}"
            defaultValue={subscription?.payment_card_last4 ?? ''}
          />
        </div>
      </div>

      {/* 결제 정보 (recurring / prepaid 분기) */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          {isRecurring ? '정기 결제 정보' : '충전 정보'}
        </h4>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 월 결제금액 / 마지막 충전액 */}
          <Input
            id="monthly_cost"
            name="monthly_cost"
            type="number"
            label={isRecurring ? '월 결제금액' : '마지막 충전액'}
            placeholder="0.00"
            step="0.01"
            min="0"
            required={isRecurring}
            defaultValue={subscription?.monthly_cost ?? ''}
          />

          {/* 통화 */}
          <Select
            id="currency"
            name="currency"
            label="통화"
            options={currencyOptions}
            defaultValue={subscription?.currency ?? 'USD'}
          />

          {/* 결제일 (recurring만 필수) */}
          {isRecurring && (
            <Input
              id="billing_day"
              name="billing_day"
              type="number"
              label="결제일"
              placeholder="1~31"
              min={1}
              max={31}
              required
              defaultValue={subscription?.billing_day ?? ''}
            />
          )}
        </div>
      </div>

      {/* 크레딧 정보 */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          {isRecurring ? '크레딧 정보 (선택)' : '크레딧 정보'}
        </h4>
        {!isRecurring && (
          <p className="mb-3 text-xs text-gray-500">
            선불 서비스의 잔여 크레딧을 입력하면 대시보드에서 한눈에 확인할 수 있습니다.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="total_credits"
            name="total_credits"
            type="number"
            label="총 크레딧"
            placeholder="예: 1000000"
            min={0}
            defaultValue={subscription?.total_credits ?? ''}
          />
          <Input
            id="remaining_credits"
            name="remaining_credits"
            type="number"
            label="잔여 크레딧"
            placeholder="예: 750000"
            min={0}
            defaultValue={subscription?.remaining_credits ?? ''}
          />
          <Input
            id="credit_unit"
            name="credit_unit"
            label="크레딧 단위"
            placeholder="예: tokens, credits"
            defaultValue={subscription?.credit_unit ?? ''}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? '저장 중...'
            : mode === 'create'
              ? '서비스 추가'
              : '변경사항 저장'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
