# 백엔드 OAuth 설계 — 하루한절

> 업데이트: 2026-05-21 | DB: Supabase Auth 활용

## 1. 인증 방식

| 방식 | 상태 | 비고 |
|------|------|------|
| 이메일/패스워드 | ✅ 구현 완료 | Supabase Auth 기본 제공 |
| 카카오 OAuth | 🔄 추후 구현 | Supabase Auth → Kakao Provider |
| Google OAuth | 🔄 추후 구현 | Supabase Auth → Google Provider |

## 2. Supabase Auth 흐름

### 이메일/패스워드
```
앱 → supabase.auth.signUp({ email, password, options: { data: { nickname } } })
   → Supabase 이메일 인증 발송
   → 사용자 인증 클릭
   → supabase.auth.signInWithPassword({ email, password })
   → Session (access_token + refresh_token) 반환
   → 스토리지 저장 (Web: localStorage / Native: SecureStore)
```

### 자동 사용자 프로필 생성
```sql
-- auth.users INSERT 시 트리거로 public.users 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 3. 세션 관리

| 항목 | 값 |
|------|-----|
| Access Token 만료 | Supabase 기본 (1시간) |
| Refresh Token | 자동 갱신 (autoRefreshToken: true) |
| 저장소 (Web) | localStorage |
| 저장소 (Native) | expo-secure-store |

## 4. 추후 카카오/Google 적용 시

```typescript
// 카카오 (Supabase Custom OAuth)
await supabase.auth.signInWithOAuth({ provider: 'kakao' })

// Google
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

Supabase Dashboard → Authentication → Providers에서 각 앱키 설정 필요.

## 5. 관련 파일

- `lib/supabase.ts` — Supabase 클라이언트 (플랫폼별 스토리지)
- `hooks/useAuth.ts` — 인증 상태 훅
- `app/(auth)/login.tsx` — 로그인/회원가입 화면
- `app/_layout.tsx` — 인증 상태 기반 라우팅
