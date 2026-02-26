/** 크레딧 배치별 만료 정보 */
export interface CreditGrant {
  grantId: string;
  grantAmount: number;
  usedAmount: number;
  remainingAmount: number;
  expiresAt: string | null;   // ISO 8601
  effectiveAt: string | null; // 크레딧 적용일 (ISO 8601)
}

/** 각 서비스 파서가 구현해야 하는 인터페이스 */
export interface CreditData {
  serviceName: string;
  remainingCredits: number;
  usedCredits: number;
  totalCredits: number;
  unit: string; // 'tokens', 'credits', 'characters', 'songs', etc.
  collectedAt: string;
  creditGrants?: CreditGrant[]; // 배치별 만료 정보 (선불 서비스)
}

export interface ServiceParser {
  /** 서비스 이름 */
  name: string;
  /** 데이터 소스: api(공식 API) / session(세션 기반 스크래핑) */
  source: 'api' | 'session';
  /** storage에서 credential 로드. 준비 완료 시 true 반환 */
  init(): Promise<boolean>;
  /** 크레딧 데이터 수집 */
  collect(): Promise<CreditData | null>;
  /** 인증 상태 확인 */
  checkAuth(): Promise<boolean>;
}
