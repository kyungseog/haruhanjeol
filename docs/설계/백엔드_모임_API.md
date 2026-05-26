# 백엔드 모임 API 설계 — 하루한절

> 업데이트: 2026-05-26 | DB: Supabase (jjwvfmujdqalcthjnvom)

## 1. DB 스키마

```sql
groups              -- 모임 정보 (최대 8명)
group_members       -- 모임 멤버
group_invite_links  -- 초대 링크 (딥링크, 7일 유효)
group_reactions     -- 이모지 반응
group_messages      -- 응원 메시지
push_tokens         -- 유저별 Expo 푸시 토큰 (platform 포함)
```

뷰: `group_member_progress` — 멤버별 완료 절 수 / 비율 집계

## 2. 주요 비즈니스 로직

### 인원 제한 트리거
```sql
-- group_members INSERT 전 8명 초과 시 예외 발생
CREATE TRIGGER enforce_group_max_members
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION check_group_max_members();
```

### 초대 방식
- **딥링크**: `haruhanjeol://join/:token` (7일 유효)
- **모임 코드**: 6자리 영숫자 (groups.invite_code)

## 3. API 함수 (`lib/groupApi.ts`)

```typescript
createGroup(name)                     // 모임 생성 → groupId 반환
joinByCode(code)                      // 코드로 참여 → Group 반환
joinByToken(token)                    // 딥링크 토큰으로 참여 → Group 반환
createInviteLink(groupId)             // 초대 링크 생성 → token 반환
sendReaction(groupId, toUserId, emoji) // 이모지 반응
deleteGroup(groupId)                  // 모임 삭제 (생성자만)
kickMember(groupId, userId)           // 멤버 내보내기 (생성자만)
```

### 훅 (`hooks/useGroup.ts`)

```typescript
useMyGroups()        // { groups, loading, reload }
useGroupDetail(id)   // { members, feed, loading, reload }
```

## 4. 푸시 알림 (`lib/notificationService.ts`)

```typescript
registerForPushNotifications(userId)     // 권한 요청 + 토큰 upsert
notifyVerseComplete({ userId, nickname, bookName, chapter, verse })
  // 내가 속한 모든 그룹의 다른 멤버에게 절 완료 알림 (중복 제거)
notifyReaction({ toUserId, fromNickname })
  // 응원 받은 유저에게 알림
```

### Edge Function (`supabase/functions/send-push/index.ts`)

- Deno 런타임
- `push_tokens` 테이블에서 대상 유저의 토큰 조회 (service role)
- Expo Push API(`https://exp.host/--/api/v2/push/send`)로 일괄 발송
- JWT Bearer 인증 (로그인한 유저만 호출 가능)

## 5. RLS 정책

| 테이블 | 정책 |
|--------|------|
| groups | 멤버만 조회 |
| group_members | 같은 모임 멤버만 조회 |
| group_invite_links | 멤버만 조회/삽입 |
| group_reactions | 멤버만 조회, 본인만 삽입 |
| group_messages | 멤버만 조회, 본인만 삽입 |
| push_tokens | 본인만 조회/삽입/수정, service_role은 전체 읽기 |

## 6. DB 마이그레이션 이력

| 파일 | 내용 |
|------|------|
| 001_initial_schema.sql | groups, group_members, group_invite_links, verse_progress 등 기본 스키마 |
| 002_verse_records_and_storage.sql | verse_records 테이블, Storage 버킷 정책 |
| 003_join_by_token_rpc.sql | `join_by_token(token)` RPC 함수 |
| 004_enable_pgcrypto.sql | pgcrypto 확장 활성화 (미사용, 하위호환) |
| 005_fix_create_invite_link_token.sql | `create_invite_link` — gen_random_bytes 대신 gen_random_uuid 사용 |
| 006_push_tokens.sql | push_tokens 테이블 + RLS |

## 7. 개발 상태

- [x] DB 스키마 생성 (Supabase 적용 완료)
- [x] RLS 정책 적용
- [x] API 함수 작성 (`lib/groupApi.ts`)
- [x] 모임 UI 실데이터 완전 연결
- [x] 실제 모임 생성/참여 기능 (코드 + 딥링크)
- [x] 초대 딥링크 처리 (`app/join/[token].tsx`)
- [x] 푸시 알림 인프라 (push_tokens + Edge Function + notificationService)
- [ ] 실제 기기 엔드투엔드 푸시 테스트 (EAS 개발 빌드 필요)
