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

## 개발 현황 (2026-05-25)

### ✅ 완료
- 로그인/회원가입 (이메일)
- 성경 데이터 연동 (bolls.life, 30일 캐싱)
- 홈·장목록·절작성·모임(mock)·설정 화면
- 절 진척도 Supabase 저장/조회
- 타이핑/문지르기 모드
- 사진 촬영 모드 (카메라 → Storage 업로드)
- 음성 녹음 모드 (expo-audio → Storage 업로드)
- 절 완료 토스트 + 장 완료 팝업
- 작성 이력 저장 (`verse_records` 테이블 — 타입/경로/텍스트 누적)
- 전역 한글/영어 언어 전환 (LangContext, 모든 화면에 적용)
- SafeAreaView → react-native-safe-area-context 교체

### 🔄 미구현
- OCR (사진 → Naver Clova)
- STT (음성 → Whisper)
- 모임 실제 기능 (생성/참여/피드 실데이터)
- 카카오 / Google 소셜 로그인
- 푸시 알림

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
lib/api.ts                   # 모임 API

hooks/useAuth.ts             # 인증 상태 훅
hooks/useProgress.ts         # 진척도 훅 (책별·장별·전체)

supabase/migrations/         # DB 마이그레이션 SQL

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
