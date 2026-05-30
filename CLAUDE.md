# CLAUDE.md — 하루한절

This file provides guidance to Claude Code when working in this repository.

---

## 프로젝트 개요

**앱 이름**: 하루한절  
**슬로건**: 하루한알 비타민처럼, 매일 한절씩 꾸준히  
**플랫폼**: iOS / Android (React Native + Expo)  
**목표**: 어떤 방법으로든 일생에 한 번 성경 전체를 써본다

---

## 문서 위치

```
docs/
├── 기획서.md                   # 메인 기획서 (전체 스펙)
├── 설계/
│   ├── 백엔드_OAuth.md          # 인증 설계
│   ├── 백엔드_모임_API.md       # 모임 기능 API/DB
│   ├── 프론트엔드_화면_설계.md  # 화면 구조 및 컴포넌트
│   └── 디자인_시스템.md         # 컬러/폰트/아이콘 규칙
└── QA/
    ├── 테스트케이스_로그인.md
    └── 테스트케이스_성경쓰기.md
```

---

## 확정된 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | React Native + Expo (managed) |
| DB / BaaS | Supabase |
| 인증 | Supabase Auth (이메일/패스워드 완료, 소셜 추후) |
| 성경 API | bolls.life (KRV 개역한글, KJV) |
| 폰트 | Pretendard (assets/fonts/) |
| 아이콘 | @expo/vector-icons MaterialIcons Round |
| 미디어 | expo-image-picker (카메라), expo-audio (녹음) |
| OCR | Naver Clova (한글) + Google Vision (영문) — 미구현 |
| STT | OpenAI Whisper — 미구현 |

---

## 확정된 디자인 결정

- **브랜드 컬러**: `#F5A623`
- **아이콘**: Material Icons Round
- **폰트**: Pretendard (fontWeight 대신 fontFamily로 굵기 지정)
- **앱 아이콘**: 비타민 캡슐 SVG (`components/icons/AppIcon.tsx`)

---

## 개발 현황 (2026-05-30)

### ✅ 완료
- 로그인/회원가입 (이메일)
- 성경 데이터 연동 (bolls.life, 30일 캐싱)
- 홈·장목록·절작성·모임·설정 화면
- 절 진척도 Supabase 저장/조회
- 타이핑/문지르기 모드
- 문지르기 제스처 고도화 (Reanimated 드래그 커버리지 판정, 85% + 0.6초)
- 사진 촬영 모드 (카메라 → Storage 업로드)
- 음성 녹음 모드 (expo-audio → Storage 업로드)
- 절 완료 토스트 + 장 완료 팝업
- 작성 이력 저장 (`verse_records` 테이블 — 타입/경로/텍스트 누적)
- 전역 한글/영어 언어 전환 (LangContext, 모든 화면에 적용)
- SafeAreaView → react-native-safe-area-context 교체
- 모임 실제 기능 (생성/참여/피드 실데이터 완전 연결)
- 모임 딥링크 참여 (`haruhanjeol://join/:token`, `app/join/[token].tsx`)
- 모임 초대 링크 생성 (`create_invite_link` RPC — gen_random_uuid 기반)
- 당겨서 새로고침 (RefreshControl)
- 설정 화면 언어 선택 세그먼트 컨트롤 (LangContext 연결)
- 홈 헤더 알림/계정 아이콘 탭 연결 (알림→모임탭, 계정→설정탭)
- 푸시 알림 인프라 구현:
  - `push_tokens` 테이블 + RLS (migration 006)
  - `send-push` Edge Function (Deno, Expo Push API)
  - `lib/notificationService.ts` — 토큰 등록, `notifyVerseComplete`, `notifyReaction`
  - 절 완료 시 모임 멤버 알림 (`write.tsx`)
  - 응원 버튼 클릭 시 알림 (`group.tsx`)
  - 알림 탭 수신 → 모임화면 이동 (`_layout.tsx`)
- 영어 성경(KJV) HTML 태그 제거 — `<sup>`, `<S>` 등 (`bibleService.ts` `cleanText`)
- 하루 목표량 설정 + 쓰기 알림:
  - `users` 테이블에 목표/알림 컬럼 추가 (migration 007)
  - `lib/goalService.ts` — 목표 저장/조회, 오늘 완료 절 수 조회, 로컬 반복 알림 등록/취소
  - 설정 화면 "하루 목표량" 섹션: 절 수 입력(완성까지 남은 기간 표시) / 완성 날짜 선택(하루 필요 절 수 표시)
  - 설정 화면 "쓰기 알림" 섹션: 목표 미달성 알림 토글 + 시각 설정 (시/분 버튼)
  - 절 완료 시 오늘 목표 달성 여부 확인 후 알림 자동 취소 (`write.tsx`)
  - iOS: DatePicker 바텀시트 모달 (취소/확인 버튼) / Android: 시스템 다이얼로그
  - 설정 화면 진척도 실데이터 연결 (`useAllProgress` 훅)

### ⚠️ 제한 사항 (실제 기기 필요)
- 푸시 토큰 실제 등록: Expo Go + 시뮬레이터에서는 불가. `eas init` 후 개발 빌드 필요
- 실제 푸시 수신: 실제 iOS/Android 기기 필요
- 로컬 알림(목표 미달성 알림): 시뮬레이터에서 스케줄 등록은 되나 실제 수신은 실기기 필요

### 🔄 미구현
- OCR (사진 → Naver Clova) — API 키 필요
- STT (음성 → Whisper) — API 키 필요
- 카카오 / Google 소셜 로그인

---

## 코드 컨벤션

- **폰트**: `fontFamily: 'Pretendard-Bold'` (fontWeight 사용 금지)
- **아이콘**: `<MaterialIcons name="..." size={} color={} />`
- **색상**: `Colors.*` (`constants/colors.ts`)
- **경로 별칭**: `@/` = 프로젝트 루트 (`tsconfig.json` + `babel.config.js`)
- **스토리지**: Web = localStorage, Native = SecureStore (`lib/supabase.ts`)

---

## 주요 파일 경로

```
app/_layout.tsx              # 루트 레이아웃 + 인증 라우팅
app/(auth)/login.tsx         # 로그인/회원가입
app/(tabs)/index.tsx         # 홈 (성경 목록)
app/(tabs)/group.tsx         # 모임
app/(tabs)/settings.tsx      # 설정
app/bible/[bookId].tsx       # 장 목록
app/bible/write.tsx          # 절 작성

lib/supabase.ts              # Supabase 클라이언트
lib/bibleService.ts          # 성경 데이터 (bolls.life + 캐싱)
lib/progressService.ts       # 진척도 저장/조회 (verse_progress, verse_records)
lib/storageService.ts        # Storage 업로드/서명 URL (verse-media 버킷)
lib/langContext.tsx          # 전역 언어 상태 (LangProvider, useLang)
lib/groupApi.ts              # 모임 API (생성/참여/피드/반응/초대링크)
lib/notificationService.ts   # 푸시 알림 (토큰 등록, 절완료 알림, 응원 알림)
lib/goalService.ts           # 하루 목표량 (저장/조회, 오늘 완료 수, 로컬 알림 스케줄)

hooks/useAuth.ts             # 인증 상태 훅
hooks/useProgress.ts         # 진척도 훅 (책별·장별·전체)
hooks/useGroup.ts            # 모임 훅 (useMyGroups, useGroupDetail)

app/join/[token].tsx         # 딥링크 모임 참여 처리

supabase/migrations/         # DB 마이그레이션 SQL
supabase/functions/send-push/index.ts  # 푸시 발송 Edge Function

constants/colors.ts          # 색상 토큰
constants/fonts.ts           # 폰트 상수
constants/icons.ts           # 아이콘 이름 상수
constants/bible.ts           # 성경 66권 데이터
```

---

## Supabase

- **Project ID**: `jjwvfmujdqalcthjnvom`
- **Region**: ap-northeast-2 (Seoul)
- **환경변수**: `.env.local` (`.gitignore`에 포함)
- **마이그레이션**: `supabase/migrations/`
