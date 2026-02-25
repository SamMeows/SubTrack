# SubTrack AI - Agent Collaboration Guide

## Project Overview
AI 서비스 구독/크레딧을 한 곳에서 관리하는 대시보드 + Chrome Extension.
인디해커 패턴: 나만 쓰는 MVP → SaaS 확장.

## Architecture

```
subtrack-ai/
├── apps/
│   ├── web/          # Next.js 14 (App Router) - 대시보드 웹앱
│   └── extension/    # Chrome Extension (Manifest V3) - 크레딧 자동 수집
├── packages/
│   ├── shared/       # 공유 타입, 상수, 유틸리티
│   └── supabase/     # DB 마이그레이션, 시드 데이터
├── CLAUDE.md         # 이 파일 - 에이전트 협업 가이드
└── package.json      # npm workspaces 루트
```

## Tech Stack
- **Web**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Extension**: Chrome Manifest V3, Vite, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Shared**: TypeScript types, constants
- **Package Manager**: npm workspaces

## Current Phase: Phase 1 MVP

### Phase 1 Goals
1. 서비스 등록 (이름, 플랜, 계정, 결제카드, 금액, 갱신일)
2. 대시보드 (월 지출 합계, 크레딧 잔여량 바 차트, 갱신일 타임라인)
3. 크레딧 이력 (시간별 사용량 추이 그래프)
4. Chrome Extension으로 6개 서비스 크레딧 자동 수집
5. Supabase Auth (본인 계정만 사용)

### Supported Services (Extension)
| Service | Source | Method |
|---------|--------|--------|
| Claude API | api | API Key → Anthropic API |
| OpenAI | api | API Key → OpenAI API |
| ElevenLabs | api | API Key → ElevenLabs API |
| Suno | session | Session cookie → background fetch |
| Midjourney | session | Session cookie → background fetch |
| Meshy AI | session | Session cookie → background fetch |

## Agent Roles & Responsibilities

### Agent: Web Dashboard (apps/web)
- Next.js App Router 페이지 및 컴포넌트 개발
- Supabase 클라이언트 연동 (client.ts / server.ts)
- Tailwind CSS로 UI 구현
- recharts로 차트 구현
- 작업 시 `apps/web/src/` 하위에서 작업

### Agent: Chrome Extension (apps/extension)
- 서비스별 파서 개발 (src/parsers/)
- Background service worker 로직 (src/background/)
- Popup UI (src/popup/)
- Supabase에 수집 데이터 저장
- 작업 시 `apps/extension/src/` 하위에서 작업

### Agent: Shared/DB (packages/)
- DB 스키마 변경 시 마이그레이션 작성 (packages/supabase/migrations/)
- 타입 정의 변경 시 shared 패키지 업데이트 (packages/shared/src/)
- 새 테이블/컬럼 추가 시 database.types.ts 동기화

## Coding Conventions

### General
- TypeScript strict mode
- 한국어 주석 허용, 코드는 영어
- 함수/변수: camelCase
- 타입/인터페이스: PascalCase
- 파일명: kebab-case (React 컴포넌트는 PascalCase)
- 절대 경로 import: `@/*` (web), `@subtrack/shared` (shared)

### Web (Next.js)
- App Router 사용 (pages/ 아님)
- Server Components 우선, 필요시 `'use client'`
- Supabase 서버 컴포넌트: `createServerSupabaseClient()`
- Supabase 클라이언트 컴포넌트: `createClient()`
- API 라우트: `app/api/` 사용

### Extension
- Manifest V3 규격 준수
- Background: Service Worker (ES Module)
- 새 파서 추가 시 `ServiceParser` 인터페이스 구현
- chrome.storage.local에 설정 저장
- Supabase 직접 연결 (서버 경유 없음)

### Database
- 테이블명: snake_case, 복수형
- 컬럼명: snake_case
- RLS 필수: 모든 테이블에 user_id 기반 정책
- UUID primary key (uuid_generate_v4)
- timestamptz 사용 (not timestamp)

## Environment Variables

### Web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Extension (chrome.storage.local)
```
supabase_url
supabase_anon_key
user_access_token
```

## Key Files
- `packages/shared/src/types.ts` - 핵심 도메인 타입
- `packages/shared/src/database.types.ts` - Supabase DB 타입
- `packages/shared/src/constants.ts` - 서비스 목록, 통화 등
- `packages/supabase/migrations/001_initial_schema.sql` - DB 스키마
- `apps/web/src/lib/supabase/` - Supabase 클라이언트 설정
- `apps/extension/src/parsers/types.ts` - Extension 파서 인터페이스

## Commands
```bash
# 전체 의존성 설치
npm install

# 웹앱 개발 서버
npm run dev:web

# Extension 빌드 (watch mode)
npm run dev:ext

# 전체 빌드
npm run build

# 타입 체크
npm run type-check
```

## Important Notes
- Phase 1은 싱글 유저 (본인만 사용). 멀티테넌시는 Phase 2에서.
- Extension의 세션 기반 파서는 서비스 ToS를 검토해야 함 (SaaS 배포 전).
- DOM 기반 파서는 깨질 수 있음 → Phase 2에서 서버 사이드 파서 배포 구조로 전환.
