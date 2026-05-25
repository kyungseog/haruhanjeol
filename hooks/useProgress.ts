import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getAllBookProgress,
  getBookProgress,
  getChapterCompletedVerses,
} from '@/lib/progressService';
import { BIBLE_BOOKS } from '@/constants/bible';

// 책별 진척도 (0~1)
export function useAllProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [totalProgress, setTotalProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const counts = await getAllBookProgress(user.id);

      // 책별 총 절 수 매핑
      const bookTotals: Record<string, number> = {};
      // 성경 전체 절 수 (근사값, 책별 평균 chapter * 평균 verse)
      // 정확한 값은 DB에 있는 실제 절 수 기반으로 계산
      // 일단 완료된 절 수 / 추정 총 절 수로 비율 계산
      const BOOK_VERSE_COUNTS: Record<string, number> = {
        gen:533, exo:1213, lev:859, num:1288, deu:959, jos:658, jdg:618,
        rut:85, '1sa':810, '2sa':695, '1ki':816, '2ki':719, '1ch':942,
        '2ch':822, ezr:280, neh:406, est:167, job:1070, psa:2461, pro:915,
        ecc:222, sng:117, isa:1292, jer:1364, lam:154, ezk:1273, dan:357,
        hos:197, jol:73, amo:146, oba:21, jon:48, mic:105, nam:47,
        hab:56, zep:53, hag:38, zec:211, mal:55,
        mat:1071, mrk:678, luk:1151, jhn:879, act:1007, rom:433, '1co':437,
        '2co':257, gal:149, eph:155, php:104, col:95, '1th':89, '2th':47,
        '1ti':113, '2ti':83, tit:46, phm:25, heb:303, jas:108, '1pe':105,
        '2pe':61, '1jn':105, '2jn':13, '3jn':14, jud:25, rev:404,
      };

      const pctMap: Record<string, number> = {};
      let totalCompleted = 0;
      let totalVerses = 0;

      for (const book of BIBLE_BOOKS) {
        const total = BOOK_VERSE_COUNTS[book.id] ?? 1;
        const completed = counts[book.id] ?? 0;
        pctMap[book.id] = Math.min(completed / total, 1);
        totalCompleted += completed;
        totalVerses += total;
      }

      setProgress(pctMap);
      setTotalProgress(totalCompleted / totalVerses);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { progress, totalProgress, loading, reload: load };
}

// 특정 책의 장별 진척도
export function useBookProgress(bookId: string) {
  const { user } = useAuth();
  const [completedVerses, setCompletedVerses] = useState<
    Array<{ chapter: number; verse: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !bookId) return;
    setLoading(true);
    try {
      const data = await getBookProgress(user.id, bookId);
      setCompletedVerses(data.map(r => ({ chapter: r.chapter, verse: r.verse })));
    } finally {
      setLoading(false);
    }
  }, [user, bookId]);

  useEffect(() => { load(); }, [load]);

  // 장별 완료 절 수
  const chapterCompletedCount = (chapter: number) =>
    completedVerses.filter(v => v.chapter === chapter).length;

  return { completedVerses, chapterCompletedCount, loading, reload: load };
}

// 특정 장의 완료된 절 번호 목록
export function useChapterProgress(bookId: string, chapter: number) {
  const { user } = useAuth();
  const [completedVerseNrs, setCompletedVerseNrs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !bookId) return;
    setLoading(true);
    try {
      const data = await getChapterCompletedVerses(user.id, bookId, chapter);
      setCompletedVerseNrs(data);
    } finally {
      setLoading(false);
    }
  }, [user, bookId, chapter]);

  useEffect(() => { load(); }, [load]);

  return { completedVerseNrs, loading, reload: load };
}
