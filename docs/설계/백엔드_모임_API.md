# 백엔드 모임 API 설계 — 하루한절

> 업데이트: 2026-05-21 | DB: Supabase (jjwvfmujdqalcthjnvom)

## 1. DB 스키마

```sql
groups              -- 모임 정보 (최대 8명)
group_members       -- 모임 멤버
group_invite_links  -- 초대 링크 (딥링크, 7일 유효)
group_reactions     -- 이모지 반응
group_messages      -- 응원 메시지
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

## 3. API 함수 (`lib/api.ts`)

```typescript
groupApi.getMyGroups(userId)          // 내 모임 목록
groupApi.joinByCode(code, userId)     // 코드로 참여
groupApi.joinByLink(token, userId)    // 링크로 참여
groupApi.getGroupProgress(groupId)    // 멤버 진척도 (뷰 조회)
groupApi.sendReaction(payload)        // 이모지 반응
groupApi.sendMessage(payload)         // 응원 메시지
```

## 4. RLS 정책

| 테이블 | 정책 |
|--------|------|
| groups | 멤버만 조회 |
| group_members | 같은 모임 멤버만 조회 |
| group_invite_links | 멤버만 조회/삽입 |
| group_reactions | 멤버만 조회, 본인만 삽입 |
| group_messages | 멤버만 조회, 본인만 삽입 |

## 5. 개발 상태

- [x] DB 스키마 생성 (Supabase 적용 완료)
- [x] RLS 정책 적용
- [x] API 함수 작성 (`lib/api.ts`)
- [x] 모임 UI 기본 구현 (mock 데이터)
- [ ] 실제 모임 생성/참여 기능 연결
- [ ] 푸시 알림 트리거 구현
- [ ] 초대 딥링크 처리
