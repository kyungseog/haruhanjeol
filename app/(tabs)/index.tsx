import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppIcon } from '@/components/icons/AppIcon';
import { Colors } from '@/constants/colors';
import { OLD_TESTAMENT, NEW_TESTAMENT } from '@/constants/bible';
import { useAllProgress } from '@/hooks/useProgress';
import { useLang } from '@/lib/langContext';

export default function HomeScreen() {
  const { progress, totalProgress, loading } = useAllProgress();
  const { lang, setLang } = useLang();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppIcon size={28} variant="light" />
          <Text style={styles.headerTitle}>하루한절</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.langToggle}>
            {(['ko', 'en'] as const).map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.langOpt, lang === l && styles.langOptActive]}
                onPress={() => setLang(l)}
              >
                <Text style={[styles.langOptText, lang === l && styles.langOptTextActive]}>
                  {l === 'ko' ? '한글' : 'ENG'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/group')}>
            <MaterialIcons name="notifications" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
            <MaterialIcons name="account-circle" size={26} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 전체 진척도 */}
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>전체 진척도</Text>
              <Text style={styles.progressPct}>{(totalProgress * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${totalProgress * 100}%` as any }]} />
            </View>
            <Text style={styles.progressSub}>
              {Math.round(totalProgress * 31103).toLocaleString()} / 31,103절 완료
            </Text>
          </View>

          {/* 구약 */}
          <Text style={styles.sectionTitle}>
            {lang === 'en' ? 'Old Testament · 39' : '구약 · 39권'}
          </Text>
          <View style={styles.booksGrid}>
            {OLD_TESTAMENT.map(book => (
              <BookCard
                key={book.id}
                name={lang === 'en' ? book.nameEn : book.name}
                progress={progress[book.id] ?? 0}
                onPress={() => router.push(`/bible/${book.id}`)}
              />
            ))}
          </View>

          {/* 신약 */}
          <Text style={styles.sectionTitle}>
            {lang === 'en' ? 'New Testament · 27' : '신약 · 27권'}
          </Text>
          <View style={styles.booksGrid}>
            {NEW_TESTAMENT.map(book => (
              <BookCard
                key={book.id}
                name={lang === 'en' ? book.nameEn : book.name}
                progress={progress[book.id] ?? 0}
                onPress={() => router.push(`/bible/${book.id}`)}
              />
            ))}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BookCard({ name, progress, onPress }: { name: string; progress: number; onPress: () => void }) {
  const isDone = progress >= 1;
  const isPartial = progress > 0 && progress < 1;
  const pct = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.bookCard, isDone && styles.bookCardDone, isPartial && styles.bookCardPartial]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* flex:1 컨테이너로 감싸 절대포지션 형제 요소와 독립적으로 중앙 정렬 */}
      <View style={styles.bookTextBox}>
        <Text style={[styles.bookName, isDone && styles.bookNameDone]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.bookPct, progress === 0 && styles.bookPctZero]}>
          {isDone ? '완료' : progress === 0 ? '0%' : `${pct}%`}
        </Text>
      </View>

      {/* 배경 fill */}
      {progress > 0 && (
        <View style={[styles.bookFill, { height: `${progress * 100}%` as any }]} />
      )}

      {/* 하단 진척도 바 */}
      {isPartial && (
        <View style={styles.bookProgressBar}>
          <View style={[styles.bookProgressFill, { width: `${pct}%` as any }]} />
        </View>
      )}

      {/* 완료 뱃지 */}
      {isDone && (
        <View style={styles.bookDoneBadge}>
          <MaterialIcons name="check" size={10} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  langToggle: { flexDirection: 'row', backgroundColor: Colors.brandLight, borderRadius: 20, padding: 3 },
  langOpt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  langOptActive: { backgroundColor: Colors.brand },
  langOptText: { fontSize: 11, fontFamily: 'Pretendard-SemiBold', color: Colors.textTertiary },
  langOptTextActive: { color: 'white' },
  progressCard: {
    margin: 16, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  progressPct: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: Colors.brand,
  },
  progressSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  sectionTitle: {
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4,
    fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.textSecondary, letterSpacing: 0.5,
  },
  booksGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 4,
  },
  bookCard: {
    width: '22%', aspectRatio: 1.1, backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden', alignItems: 'stretch',
  },
  bookTextBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  bookCardDone: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  bookCardPartial: { borderColor: 'rgba(245,166,35,0.4)' },
  bookFill: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(245,166,35,0.13)',
  },
  bookName: {
    fontSize: 12, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary,
    textAlign: 'center', paddingHorizontal: 3,
  },
  bookNameDone: { color: Colors.brandGold },
  bookPct: { fontSize: 10, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  bookPctZero: { color: Colors.textTertiary },
  bookProgressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
  },
  bookProgressFill: {
    height: '100%' as any, backgroundColor: Colors.brand,
  },
  bookDoneBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
});
