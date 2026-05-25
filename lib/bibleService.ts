import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookById } from '@/constants/bible';

export type BibleVerse = {
  verse: number;
  text: string;
};

// bolls.life 번역 코드
// 한글: KRV = 개역한글 (추후 개역개정 라이선스 취득 시 교체)
// 영어: KJV = King James Version (추후 NIV API 키 적용 시 교체)
const TRANSLATION = {
  ko: 'KRV',
  en: 'KJV',
} as const;

// Strong's 번호 태그 제거 (<S>1234</S>)
function cleanText(text: string): string {
  return text.replace(/<S>\d+<\/S>/g, '').replace(/\s+/g, ' ').trim();
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일

type CacheEntry = {
  verses: BibleVerse[];
  fetchedAt: number;
};

async function fetchFromApi(
  bookNr: number,
  chapter: number,
  lang: 'ko' | 'en',
): Promise<BibleVerse[]> {
  const translation = TRANSLATION[lang];
  const url = `https://bolls.life/get-chapter/${translation}/${bookNr}/${chapter}/`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bible API ${res.status}: ${url}`);

  const data: Array<{ verse: number; text: string }> = await res.json();
  return data.map(v => ({
    verse: v.verse,
    text: cleanText(v.text),
  }));
}

function cacheKey(bookNr: number, chapter: number, lang: 'ko' | 'en') {
  return `bible_v2:${lang}:${bookNr}:${chapter}`;
}

async function getFromCache(key: string): Promise<BibleVerse[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.verses;
  } catch {
    return null;
  }
}

async function saveToCache(key: string, verses: BibleVerse[]) {
  try {
    const entry: CacheEntry = { verses, fetchedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

export async function getChapter(
  bookId: string,
  chapter: number,
  lang: 'ko' | 'en' = 'ko',
): Promise<BibleVerse[]> {
  const book = getBookById(bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);

  const key = cacheKey(book.nr, chapter, lang);

  const cached = await getFromCache(key);
  if (cached) return cached;

  const verses = await fetchFromApi(book.nr, chapter, lang);
  await saveToCache(key, verses);
  return verses;
}

export async function getVerse(
  bookId: string,
  chapter: number,
  verse: number,
  lang: 'ko' | 'en' = 'ko',
): Promise<BibleVerse | null> {
  const verses = await getChapter(bookId, chapter, lang);
  return verses.find(v => v.verse === verse) ?? null;
}

export function clearBibleCache() {
  return AsyncStorage.getAllKeys().then(keys => {
    const bibleKeys = keys.filter(k => k.startsWith('bible_v2:'));
    return AsyncStorage.multiRemove(bibleKeys);
  });
}
