-- ============================================================
-- 하루한절 초기 스키마
-- ============================================================

-- ── 사용자 ──────────────────────────────────────────────────
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      VARCHAR(20)  NOT NULL,          -- 'kakao' | 'google'
  provider_id   VARCHAR(100),
  email         VARCHAR(255),
  nickname      VARCHAR(100),
  profile_image TEXT,
  default_lang  VARCHAR(5)   NOT NULL DEFAULT 'ko',  -- 'ko' | 'en'
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인만 조회" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "본인만 수정" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ── 절 진척도 ─────────────────────────────────────────────
CREATE TABLE public.verse_progress (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id          VARCHAR(10)  NOT NULL,   -- 'gen', 'mat' 등
  chapter          INT          NOT NULL,
  verse            INT          NOT NULL,
  language         VARCHAR(5)   NOT NULL DEFAULT 'ko',
  total_lines      INT          NOT NULL DEFAULT 1,
  completed_lines  INT[]        NOT NULL DEFAULT '{}',
  fully_complete_at TIMESTAMPTZ,
  rub_count        INT          NOT NULL DEFAULT 0,
  last_rub_at      TIMESTAMPTZ,
  last_updated     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id, chapter, verse)
);

ALTER TABLE public.verse_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인만 조회" ON public.verse_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인만 삽입" ON public.verse_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 수정" ON public.verse_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_verse_progress_user ON public.verse_progress(user_id);
CREATE INDEX idx_verse_progress_book ON public.verse_progress(user_id, book_id);

-- ── 모임 ─────────────────────────────────────────────────
CREATE TABLE public.groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  max_members  INT         NOT NULL DEFAULT 8,
  invite_code  VARCHAR(6)  NOT NULL UNIQUE,
  created_by   UUID        REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "멤버만 조회" ON public.groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = groups.id AND user_id = auth.uid()
  ));

-- ── 모임 멤버 ───────────────────────────────────────────────
CREATE TABLE public.group_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "멤버만 조회" ON public.group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));

-- ── 초대 링크 ─────────────────────────────────────────────
CREATE TABLE public.group_invite_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID        REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 이모지 반응 ───────────────────────────────────────────
CREATE TABLE public.group_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user  UUID        NOT NULL REFERENCES public.users(id),
  to_user    UUID        NOT NULL REFERENCES public.users(id),
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "멤버만 조회" ON public.group_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_reactions.group_id AND user_id = auth.uid()
  ));
CREATE POLICY "멤버만 삽입" ON public.group_reactions FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- ── 응원 메시지 ───────────────────────────────────────────
CREATE TABLE public.group_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user  UUID        NOT NULL REFERENCES public.users(id),
  to_user    UUID        REFERENCES public.users(id),  -- NULL = 전체
  content    VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "멤버만 조회" ON public.group_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  ));
CREATE POLICY "멤버만 삽입" ON public.group_messages FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- ── 모임 진척도 집계 뷰 ───────────────────────────────────
CREATE VIEW public.group_member_progress AS
SELECT
  gm.group_id,
  gm.user_id,
  u.nickname,
  u.profile_image,
  COUNT(vp.id) FILTER (WHERE vp.fully_complete_at IS NOT NULL) AS completed_verses,
  ROUND(
    COUNT(vp.id) FILTER (WHERE vp.fully_complete_at IS NOT NULL)::NUMERIC / 31103 * 100, 1
  ) AS progress_pct
FROM public.group_members gm
JOIN public.users u ON u.id = gm.user_id
LEFT JOIN public.verse_progress vp ON vp.user_id = gm.user_id
GROUP BY gm.group_id, gm.user_id, u.nickname, u.profile_image;

-- ── 모임 인원 제한 트리거 ─────────────────────────────────
CREATE OR REPLACE FUNCTION check_group_max_members()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.group_members WHERE group_id = NEW.group_id)
     >= (SELECT max_members FROM public.groups WHERE id = NEW.group_id) THEN
    RAISE EXCEPTION '모임 최대 인원(8명)에 도달했습니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_group_max_members
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION check_group_max_members();

-- ── updated_at 자동 갱신 ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
