import { supabase } from './supabase';

export type WriteMode = 'type' | 'photo' | 'voice' | 'rub';

export type VerseProgressRow = {
  book_id: string;
  chapter: number;
  verse: number;
  language: 'ko' | 'en';
  total_lines: number;
  completed_lines: number[];
  fully_complete_at: string | null;
  rub_count: number;
  write_mode: WriteMode | null;
};

export type VerseRecord = {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  language: 'ko' | 'en';
  write_mode: WriteMode;
  typed_text: string | null;
  storage_path: string | null;
  file_type: string | null;
  created_at: string;
};

// 절 완료 저장 (upsert)
export async function saveVerseProgress(params: {
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  language: 'ko' | 'en';
  totalLines: number;
  completedLines: number[];
  fullyComplete: boolean;
  rubCount?: number;
  writeMode?: WriteMode;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('verse_progress').upsert(
    {
      user_id: params.userId,
      book_id: params.bookId,
      chapter: params.chapter,
      verse: params.verse,
      language: params.language,
      total_lines: params.totalLines,
      completed_lines: params.completedLines,
      fully_complete_at: params.fullyComplete ? now : null,
      rub_count: params.rubCount ?? 0,
      last_rub_at: params.rubCount ? now : null,
      last_updated: now,
      write_mode: params.writeMode ?? null,
    },
    { onConflict: 'user_id,book_id,chapter,verse' },
  );
  if (error) throw error;
}

// 작성 이력 저장 (매번 insert — 덮어쓰지 않고 이력 누적)
export async function saveVerseRecord(params: {
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  language: 'ko' | 'en';
  writeMode: WriteMode;
  typedText?: string;
  storagePath?: string;
  fileType?: string;
}) {
  const { error } = await supabase.from('verse_records').insert({
    user_id:      params.userId,
    book_id:      params.bookId,
    chapter:      params.chapter,
    verse:        params.verse,
    language:     params.language,
    write_mode:   params.writeMode,
    typed_text:   params.typedText   ?? null,
    storage_path: params.storagePath ?? null,
    file_type:    params.fileType    ?? null,
  });
  if (error) throw error;
}

// 특정 절의 작성 이력 조회
export async function getVerseRecords(
  userId: string,
  bookId: string,
  chapter: number,
  verse: number,
): Promise<VerseRecord[]> {
  const { data, error } = await supabase
    .from('verse_records')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('verse', verse)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 특정 책의 진척도 (장별 완료 절 수)
export async function getBookProgress(userId: string, bookId: string) {
  const { data, error } = await supabase
    .from('verse_progress')
    .select('chapter, verse, fully_complete_at, completed_lines, total_lines')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .not('fully_complete_at', 'is', null);

  if (error) throw error;
  return data ?? [];
}

// 전체 책별 완료 절 수 집계
export async function getAllBookProgress(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('verse_progress')
    .select('book_id')
    .eq('user_id', userId)
    .not('fully_complete_at', 'is', null);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.book_id] = (counts[row.book_id] ?? 0) + 1;
  }
  return counts;
}

// 장별 완료 절 번호 목록
export async function getChapterCompletedVerses(
  userId: string,
  bookId: string,
  chapter: number,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('verse_progress')
    .select('verse')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .not('fully_complete_at', 'is', null);

  if (error) throw error;
  return (data ?? []).map(r => r.verse);
}
