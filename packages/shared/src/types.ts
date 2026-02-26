import type { ServiceName, BillingType } from './constants';

/** 데이터 소스 유형 */
export type ServiceDataSource = 'api' | 'extension' | 'manual';

/** 알림 유형 */
export type AlertType = 'renewal' | 'low_credit';

/** 알림 채널 */
export type AlertChannel = 'email' | 'slack';

/** 통화 */
export type Currency = 'USD' | 'KRW' | 'EUR' | 'JPY';

/** 구독 서비스 */
export interface Subscription {
  id: string;
  user_id: string;
  service_name: ServiceName;
  plan_name: string | null;
  login_email: string | null;
  payment_card_last4: string | null;
  card_nickname: string | null; // 카드 별명 (예: "신한 체크", "토스카드")
  billing_type: BillingType; // 'recurring' (정기) | 'prepaid' (선불)
  monthly_cost: number | null; // 선불은 null 가능
  currency: Currency;
  billing_day: number | null; // 1-31, 선불은 null 가능
  total_credits: number | null;
  remaining_credits: number | null;
  credit_unit: string | null; // 'tokens', 'credits', 'characters', etc.
  data_source: ServiceDataSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 크레딧 사용 로그 */
export interface CreditLog {
  id: string;
  subscription_id: string;
  remaining_credits: number;
  used_credits: number;
  collected_at: string;
  source: ServiceDataSource;
}

/** 크레딧 배치별 만료 정보 */
export interface CreditGrant {
  id: string;
  subscription_id: string;
  grant_id: string | null;
  grant_amount: number;
  used_amount: number;
  remaining_amount: number;
  expires_at: string | null;
  effective_at: string | null;
  collected_at: string;
}

/** 알림 설정 */
export interface Alert {
  id: string;
  user_id: string;
  subscription_id: string | null;
  type: AlertType;
  threshold: number | null; // low_credit일 때 잔여 % 기준
  channel: AlertChannel;
  enabled: boolean;
  created_at: string;
}
