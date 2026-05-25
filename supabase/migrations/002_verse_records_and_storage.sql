-- ── verse_progress에 write_mode 추가 ──────────────────────────
ALTER TABLE public.verse_progress
  ADD COLUMN IF NOT EXISTS write_mode VARCHAR(10);

-- ── 작성 이력 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verse_records (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id      VARCHAR(10)  NOT NULL,
  chapter      INT          NOT NULL,
  verse        INT          NOT NULL,
  language     VARCHAR(5)   NOT NULL DEFAULT 'ko',
  write_mode   VARCHAR(10)  NOT NULL,  -- 'type' | 'photo' | 'voice' | 'rub'
  typed_text   TEXT,                   -- 타이핑 텍스트
  storage_path TEXT,                   -- Storage 경로 (photo/voice)
  file_type    VARCHAR(30),            -- 'image/jpeg' | 'audio/m4a'
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verse_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인만 조회" ON public.verse_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인만 삽입" ON public.verse_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 삭제" ON public.verse_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_verse_records_user  ON public.verse_records(user_id);
CREATE INDEX idx_verse_records_verse ON public.verse_records(user_id, book_id, chapter, verse);

-- ── Storage 버킷 ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verse-media', 'verse-media', false, 10485760,
  ARRAY['image/jpeg','image/png','image/heic','audio/m4a','audio/mpeg','audio/wav','audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "본인 파일만 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verse-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "본인 파일만 조회" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verse-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "본인 파일만 삭제" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verse-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
