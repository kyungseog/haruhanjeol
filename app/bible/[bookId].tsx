import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BIBLE_BOOKS } from '@/constants/bible';
import { useBookProgress } from '@/hooks/useProgress';
import { useLang } from '@/lib/langContext';

export default function BookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { lang } = useLang();

  const book = BIBLE_BOOKS.find(b => b.id === bookId);
  const { completedVerses, chapterCompletedCount } = useBookProgress(bookId ?? '');

  if (!book) return null;

  // 장별 총 절 수 (근사: 완료 절 수 / 추정)
  // 완료된 절이 1개라도 있으면 진행 중, 장의 첫 절~마지막 절이 모두 있으면 완료
  const getChapterProgress = (chapter: number) => {
    const completed = chapterCompletedCount(chapter);
    if (completed === 0) return 0;
    // 완료 여부는 임시로 5절 이상이면 완료로 처리 (추후 실제 총 절 수 기반으로 개선)
    return completed;
  };

  const totalCompleted = completedVerses.length;
  // 전체 절 수 추정 (책마다 다름, 추후 정확한 값으로 대체)
  const estimatedTotal = book.chapters * 25;
  const totalProgress = Math.min(totalCompleted / estimatedTotal, 1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'en' ? book.nameEn : book.name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 진척도 */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{lang === 'en' ? book.nameEn : book.name}</Text>
            <Text style={styles.progressPct}>{(totalProgress * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${totalProgress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressSub}>
            {lang === 'en' ? `${totalCompleted} verses done` : `${totalCompleted}절 완료`}
          </Text>
        </View>

        {/* 장 그리드 */}
        <View style={styles.chaptersGrid}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map(chNum => {
            const completed = getChapterProgress(chNum);
            const isDone = false; // 추후 장 전체 완료 기준 적용
            const isPartial = completed > 0;
            return (
              <TouchableOpacity
                key={chNum}
                style={[styles.chapterChip, isDone && styles.chipDone, isPartial && styles.chipPartial]}
                onPress={() => router.push({ pathname: '/bible/write', params: { bookId, chapter: chNum, lang } })}
                activeOpacity={0.75}
              >
                <Text style={[styles.chapterNum, isDone && styles.chapterNumDone]}>{chNum}</Text>
                {isDone && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 범례 */}
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: Colors.brand }]} />
          <Text style={styles.legendText}>완료</Text>
          <View style={[styles.legendDot, { backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brand }]} />
          <Text style={styles.legendText}>진행중</Text>
          <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
          <Text style={styles.legendText}>미시작</Text>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 28, color: Colors.textPrimary, lineHeight: 30 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  progressCard: {
    margin: 16, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  progressPct: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brand, borderRadius: 4 },
  progressSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, fontFamily: 'Pretendard-Regular' },
  chaptersGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    paddingHorizontal: 16, gap: 10, paddingTop: 4,
  },
  chapterChip: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  chipDone: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipPartial: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  chapterNum: { fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  chapterNumDone: { color: 'white' },
  checkMark: { position: 'absolute', top: 3, right: 5, fontSize: 9, color: 'white' },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 16,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textTertiary, marginRight: 8 },
});
