import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { Colors } from '@/constants/colors';
import { getBookById } from '@/constants/bible';
import { getChapter, BibleVerse } from '@/lib/bibleService';
import { saveVerseProgress, saveVerseRecord, WriteMode } from '@/lib/progressService';
import { uploadVerseMedia } from '@/lib/storageService';
import { useAuth } from '@/hooks/useAuth';
import { useChapterProgress } from '@/hooks/useProgress';
import { Toast } from '@/components/ui/Toast';
import { MaterialIcons } from '@expo/vector-icons';
import { useLang } from '@/lib/langContext';

export default function WriteScreen() {
  const { bookId, chapter: chapterStr, verse: verseStr } =
    useLocalSearchParams<{ bookId: string; chapter: string; verse: string }>();

  const chapter = Number(chapterStr ?? 1);
  const initialVerse = Number(verseStr ?? 1);

  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const [mode, setMode] = useState<WriteMode>('type');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [rubbedLines, setRubbedLines] = useState<Set<number>>(new Set());
  const [showChapterComplete, setShowChapterComplete] = useState(false); // 장 전체 완료 팝업
  const [toastVisible, setToastVisible] = useState(false);               // 절 완료 토스트
  const [toastMsg, setToastMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const book = getBookById(bookId ?? '');
  const currentVerse = verses[currentVerseIdx];
  const { completedVerseNrs, reload: reloadProgress } = useChapterProgress(bookId ?? '', chapter);

  // 현재 세션 포함한 완료 절 수
  const sessionCompleted = useRef<Set<number>>(new Set());

  // 챕터 데이터 로드
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    getChapter(bookId, chapter, lang)
      .then(data => {
        setVerses(data);
        const idx = data.findIndex(v => v.verse === initialVerse);
        setCurrentVerseIdx(idx >= 0 ? idx : 0);
        setLoading(false);
      })
      .catch(e => {
        setError('말씀을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
        setLoading(false);
      });
  }, [bookId, chapter, lang]);

  // 언어 전환 시 진척도 초기화
  const handleLangChange = (newLang: 'ko' | 'en') => {
    setLang(newLang);
    setRubbedLines(new Set());
    setTypedText('');
  };

  // 문지르기: 줄 단위 완료
  const lines = currentVerse?.text.split(/[.!?。]+/).filter(l => l.trim().length > 0) ?? [];

  // 절 완료 저장
  const saveProgress = async (
    completedLineIdxs: number[],
    opts?: { typedText?: string; storagePath?: string; fileType?: string },
  ) => {
    if (!user || !currentVerse || !bookId) return;
    setSaving(true);
    try {
      await Promise.all([
        saveVerseProgress({
          userId: user.id,
          bookId,
          chapter,
          verse: currentVerse.verse,
          language: lang,
          totalLines: Math.max(lines.length, 1),
          completedLines: completedLineIdxs,
          fullyComplete: true,
          rubCount: mode === 'rub' ? 1 : 0,
          writeMode: mode,
        }),
        saveVerseRecord({
          userId: user.id,
          bookId,
          chapter,
          verse: currentVerse.verse,
          language: lang,
          writeMode: mode,
          typedText: opts?.typedText,
          storagePath: opts?.storagePath,
          fileType: opts?.fileType,
        }),
      ]);
      sessionCompleted.current.add(currentVerse.verse);
      await reloadProgress();

      // 장 전체 완료 여부 판단
      const allDoneInSession =
        sessionCompleted.current.size + completedVerseNrs.filter(
          n => !sessionCompleted.current.has(n)
        ).length >= verses.length;

      if (allDoneInSession && verses.length > 0) {
        setShowChapterComplete(true);
      } else {
        // 토스트 + 자동 다음 절
        showToast(lang === 'en'
          ? `${chapter}:${currentVerse.verse} done! ✅`
          : `${chapter}:${currentVerse.verse} 완료! ✅`);
        autoNextTimer.current = setTimeout(() => {
          setRubbedLines(new Set());
          setTypedText('');
          setPhotoUri(null);
          if (currentVerseIdx < verses.length - 1) {
            setCurrentVerseIdx(i => i + 1);
          }
        }, 1800);
      }
    } catch (e) {
      console.warn('진척도 저장 실패:', e);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  };

  const handleRubLine = (idx: number) => {
    setRubbedLines(prev => {
      const next = new Set(prev);
      next.add(idx);
      if (next.size >= Math.max(lines.length, 1)) {
        saveProgress(Array.from(next));
      }
      return next;
    });
  };

  const handleSubmitType = () => {
    if (!currentVerse) return;
    if (typedText.trim().length < 3) {
      Alert.alert('입력이 너무 짧아요', '말씀을 입력해주세요.');
      return;
    }
    saveProgress([0], { typedText: typedText.trim() });
  };

  const handleTakePhoto = async () => {
    if (!user || !currentVerse || !bookId) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    setSaving(true);
    try {
      const { storagePath, fileType } = await uploadVerseMedia({
        userId: user.id, bookId, chapter, verse: currentVerse.verse,
        localUri: uri, mediaType: 'photo',
      });
      await saveProgress([0], { storagePath, fileType });
    } catch (e) {
      Alert.alert('업로드 실패', '사진 저장에 실패했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('권한 필요', '마이크 접근 권한이 필요합니다.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('녹음 실패', '녹음을 시작할 수 없습니다.');
    }
  };

  const stopRecording = async () => {
    if (!user || !currentVerse || !bookId) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setSaving(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No recording URI');
      const { storagePath, fileType } = await uploadVerseMedia({
        userId: user.id, bookId, chapter, verse: currentVerse.verse,
        localUri: uri, mediaType: 'voice',
      });
      await saveProgress([0], { storagePath, fileType });
    } catch (e) {
      Alert.alert('저장 실패', '녹음 저장에 실패했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  // 장 완료 팝업 → 목록으로
  const handleGoBack = () => {
    setShowChapterComplete(false);
    router.back();
  };

  // 장 완료 팝업 → 다음 장
  const handleNextChapter = () => {
    setShowChapterComplete(false);
    if (!bookId || !book) { router.back(); return; }
    const nextChapter = chapter + 1;
    if (nextChapter <= book.chapters) {
      router.replace({ pathname: '/bible/write', params: { bookId, chapter: nextChapter } });
    } else {
      router.back(); // 마지막 장이면 목록으로
    }
  };

  const bookName = lang === 'en' ? (book?.nameEn ?? bookId) : (book?.name ?? bookId);
  const verseRef = currentVerse
    ? `${bookName} ${chapter}:${currentVerse.verse}`
    : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {bookName} {lang === 'en' ? `Chapter ${chapter}` : `${chapter}장`}
          </Text>
          <Text style={styles.headerSub}>
            {currentVerse
              ? lang === 'en'
                ? `${currentVerse.verse} / ${verses.length}`
                : `${currentVerse.verse}절 / ${verses.length}절`
              : ''}
          </Text>
        </View>
        <View style={styles.langToggle}>
          {(['ko', 'en'] as const).map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.langOpt, lang === l && styles.langOptActive]}
              onPress={() => handleLangChange(l)}
            >
              <Text style={[styles.langOptText, lang === l && styles.langOptTextActive]}>
                {l === 'ko' ? '한글' : 'ENG'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.loadingText}>말씀을 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              getChapter(bookId!, chapter, lang)
                .then(data => { setVerses(data); setLoading(false); })
                .catch(() => { setError('다시 시도해주세요.'); setLoading(false); });
            }}
          >
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {mode === 'rub' && (
              <View style={styles.hintBanner}>
                <Text style={styles.hintText}>✋ 각 줄 위를 손가락으로 밀어서 완료하세요</Text>
              </View>
            )}

            {/* 말씀 카드 */}
            {currentVerse && (
              <View style={styles.verseCard}>
                <Text style={styles.verseRef}>{verseRef}</Text>

                {mode === 'rub' ? (
                  <View style={styles.rubLines}>
                    {lines.length > 0 ? lines.map((line, i) => (
                      <RubLine
                        key={i}
                        text={line}
                        isDone={rubbedLines.has(i)}
                        onComplete={() => handleRubLine(i)}
                      />
                    )) : (
                      <RubLine
                        text={currentVerse.text}
                        isDone={rubbedLines.has(0)}
                        onComplete={() => handleRubLine(0)}
                      />
                    )}
                  </View>
                ) : (
                  <Text style={styles.verseText}>{currentVerse.text}</Text>
                )}
              </View>
            )}

            {/* 진행 표시 */}
            {mode === 'rub' && lines.length > 0 && (
              <View style={styles.rubProgress}>
                <View style={styles.rubDots}>
                  {lines.map((_, i) => (
                    <View key={i} style={[styles.rubDot, rubbedLines.has(i) && styles.rubDotDone]} />
                  ))}
                </View>
                <Text style={styles.rubProgressText}>{rubbedLines.size}/{lines.length}줄</Text>
              </View>
            )}

            {/* 절 목록 (그리드 네비) */}
            <View style={styles.verseNavGrid}>
              {verses.map((v, i) => {
                const isDone = completedVerseNrs.includes(v.verse);
                const isActive = i === currentVerseIdx;
                return (
                  <TouchableOpacity
                    key={v.verse}
                    onPress={() => { setCurrentVerseIdx(i); setRubbedLines(new Set()); setTypedText(''); setPhotoUri(null); }}
                    style={[
                      styles.verseNavItem,
                      isActive && styles.verseNavItemActive,
                      isDone && !isActive && styles.verseNavItemDone,
                    ]}
                  >
                    <Text style={[
                      styles.verseNavText,
                      isActive && styles.verseNavTextActive,
                      isDone && !isActive && styles.verseNavTextDone,
                    ]}>
                      {isDone ? '✓' : v.verse}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 타이핑 입력 */}
            {mode === 'type' && (
              <View style={styles.typeArea}>
                <TextInput
                  style={styles.typeInput}
                  multiline
                  placeholder="말씀을 직접 입력하세요..."
                  placeholderTextColor={Colors.textTertiary}
                  value={typedText}
                  onChangeText={setTypedText}
                  autoFocus
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitType}>
                  <Text style={styles.submitBtnText}>완료 확인</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'photo' && (
              <View style={styles.comingSoon}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="contain" />
                ) : (
                  <Text style={styles.comingSoonIcon}>📸</Text>
                )}
                <Text style={styles.comingSoonText}>
                  {photoUri ? '사진이 저장되었어요' : '손으로 쓴 말씀을 촬영하세요'}
                </Text>
                <TouchableOpacity
                  style={[styles.cameraBtn, saving && styles.cameraBtnDisabled]}
                  onPress={handleTakePhoto}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={styles.cameraBtnText}>{photoUri ? '다시 찍기' : '카메라 열기'}</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {mode === 'voice' && (
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonIcon}>{isRecording ? '🔴' : '🎙'}</Text>
                {isRecording && (
                  <Text style={styles.recordingTimer}>
                    {`${String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:${String(recordingDuration % 60).padStart(2, '0')}`}
                  </Text>
                )}
                <Text style={styles.comingSoonText}>
                  {isRecording ? '녹음 중... 말씀을 천천히 읽어주세요' : '말씀을 천천히 읽어주세요'}
                </Text>
                <TouchableOpacity
                  style={[styles.cameraBtn, isRecording && styles.cameraBtnStop, saving && styles.cameraBtnDisabled]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={styles.cameraBtnText}>{isRecording ? '녹음 완료' : '녹음 시작'}</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* 모드 탭 */}
          <View style={styles.modeTabs}>
            {(['type', 'photo', 'voice', 'rub'] as WriteMode[]).map(m => {
              const iconName = m === 'type' ? 'edit' : m === 'photo' ? 'photo-camera' : m === 'voice' ? 'mic' : 'swipe';
              const label = m === 'type' ? '타이핑' : m === 'photo' ? '사진' : m === 'voice' ? '음성' : '문지르기';
              const isActive = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeTab, isActive && styles.modeTabActive]}
                  onPress={() => setMode(m)}
                >
                  <MaterialIcons
                    name={iconName as any}
                    size={22}
                    color={isActive ? Colors.brand : Colors.textTertiary}
                  />
                  <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* 절 완료 토스트 */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* 장 전체 완료 팝업 */}
      {showChapterComplete && (
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <MaterialIcons name="celebration" size={40} color={Colors.brand} style={{ marginBottom: 8 }} />
            <MaterialIcons name="emoji-events" size={56} color={Colors.brand} style={{ marginBottom: 8 }} />
            <Text style={styles.completeTitle}>
              {lang === 'en'
                ? `${bookName} Ch.${chapter}\nComplete!`
                : `${bookName} ${chapter}장\n완료!`}
            </Text>
            <Text style={styles.completeSub}>
              {lang === 'en'
                ? `You wrote all ${verses.length} verses!\nOne step further today`
                : `${verses.length}절을 모두 썼어요\n오늘도 한 걸음 더 나아갔어요`}
            </Text>
            <View style={styles.completeBtns}>
              <TouchableOpacity style={styles.completeBtnSecondary} onPress={handleGoBack}>
                <Text style={styles.completeBtnSecondaryText}>
                  {lang === 'en' ? 'Back' : '목록으로'}
                </Text>
              </TouchableOpacity>
              {book && chapter < book.chapters && (
                <TouchableOpacity style={styles.completeBtnPrimary} onPress={handleNextChapter}>
                  <Text style={styles.completeBtnPrimaryText}>
                    {lang === 'en' ? `Ch.${chapter + 1}` : `${chapter + 1}장으로`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── 문지르기 줄 컴포넌트 ─────────────────────────────────────
function RubLine({ text, isDone, onComplete }: {
  text: string;
  isDone: boolean;
  onComplete: () => void;
}) {
  const fillPct   = useSharedValue(isDone ? 100 : 0);
  const minX      = useSharedValue(0);
  const maxX      = useSharedValue(0);
  const lineW     = useSharedValue(1);
  const startMsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isDone) fillPct.value = withSpring(100);
  }, [isDone]);

  const recordStart = useCallback(() => { startMsRef.current = Date.now(); }, []);

  const evaluate = useCallback((coverage: number) => {
    const duration = Date.now() - startMsRef.current;
    if (coverage >= 0.85 && duration >= 600) {
      fillPct.value = withSpring(100);
      onCompleteRef.current();
    } else {
      fillPct.value = withSpring(0);
    }
  }, [fillPct]);

  const gesture = useMemo(() => Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      minX.value = e.x;
      maxX.value = e.x;
      runOnJS(recordStart)();
    })
    .onUpdate((e) => {
      'worklet';
      if (e.x < minX.value) minX.value = e.x;
      if (e.x > maxX.value) maxX.value = e.x;
      fillPct.value = Math.min((maxX.value - minX.value) / lineW.value * 100, 100);
    })
    .onFinalize(() => {
      'worklet';
      const coverage = (maxX.value - minX.value) / lineW.value;
      runOnJS(evaluate)(coverage);
    }),
  []); // eslint-disable-line react-hooks/exhaustive-deps

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillPct.value}%` as any,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={(e) => { lineW.value = e.nativeEvent.layout.width - 24; }}
        style={[styles.rubLine, isDone && styles.rubLineDone]}
      >
        <Animated.View style={[styles.rubFill, fillStyle]} />
        <Text style={[styles.rubLineText, isDone && styles.rubLineTextDone]}>
          {text.trim()}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Pretendard-Regular' },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'Pretendard-Regular' },
  retryBtn: { backgroundColor: Colors.brand, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: 'white' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 18, color: Colors.textPrimary },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1, fontFamily: 'Pretendard-Regular' },
  langToggle: { flexDirection: 'row', backgroundColor: Colors.brandLight, borderRadius: 20, padding: 3 },
  langOpt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  langOptActive: { backgroundColor: Colors.brand },
  langOptText: { fontSize: 11, fontFamily: 'Pretendard-SemiBold', color: Colors.textTertiary },
  langOptTextActive: { color: 'white' },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 14 },
  hintBanner: { backgroundColor: Colors.brandLight, borderRadius: 10, padding: 10, alignItems: 'center' },
  hintText: { fontSize: 13, color: Colors.brandGold, fontFamily: 'Pretendard-Medium' },
  verseCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  verseRef: { fontSize: 12, color: Colors.brand, fontFamily: 'Pretendard-Bold', marginBottom: 14 },
  verseText: { fontSize: 17, color: Colors.textPrimary, lineHeight: 30, fontFamily: 'Pretendard-Regular' },
  rubLines: { gap: 8 },
  rubLine: {
    padding: 12, borderRadius: 10, overflow: 'hidden',
    backgroundColor: 'rgba(245,166,35,0.05)',
    borderWidth: 1, borderColor: 'transparent',
    position: 'relative',
  },
  rubLineDone: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: 'rgba(245,166,35,0.3)' },
  rubFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: 'rgba(245,166,35,0.22)',
    borderRadius: 10,
  },
  rubLineText: { fontSize: 16, color: Colors.textPrimary, lineHeight: 26, fontFamily: 'Pretendard-Regular' },
  rubLineTextDone: { color: Colors.brandGold, fontFamily: 'Pretendard-Medium' },
  rubProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rubDots: { flexDirection: 'row', gap: 6 },
  rubDot: { width: 28, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  rubDotDone: { backgroundColor: Colors.brand },
  rubProgressText: { fontSize: 12, color: Colors.textTertiary, fontFamily: 'Pretendard-Regular' },
  verseNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseNavItem: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  verseNavItemActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  verseNavItemDone: { backgroundColor: Colors.brandLight, borderColor: Colors.brand },
  verseNavText: { fontSize: 12, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  verseNavTextActive: { color: 'white' },
  verseNavTextDone: { color: Colors.brandGold, fontSize: 14 },
  typeArea: { gap: 12 },
  typeInput: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, minHeight: 100,
    fontSize: 16, color: Colors.textPrimary, lineHeight: 26,
    textAlignVertical: 'top', fontFamily: 'Pretendard-Regular',
  },
  submitBtn: {
    backgroundColor: Colors.brand, borderRadius: 14, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: 'white' },
  comingSoon: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  comingSoonIcon: { fontSize: 40 },
  comingSoonText: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Pretendard-Regular' },
  photoPreview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 4 },
  cameraBtn: {
    backgroundColor: Colors.brand, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 4,
    minWidth: 120, alignItems: 'center',
  },
  cameraBtnStop: { backgroundColor: '#E53935' },
  cameraBtnDisabled: { opacity: 0.6 },
  cameraBtnText: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: 'white' },
  recordingTimer: { fontSize: 28, fontFamily: 'Pretendard-Bold', color: '#E53935', letterSpacing: 2 },
  modeTabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderTopWidth: 2, borderTopColor: 'transparent' },
  modeTabActive: { borderTopColor: Colors.brand },
  modeIcon: { fontSize: 20, marginBottom: 2 },
  modeLabel: { fontSize: 10, color: Colors.textTertiary, fontFamily: 'Pretendard-Medium' },
  modeLabelActive: { color: Colors.brand },
  completeOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  completeCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 32,
    marginHorizontal: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24,
  },
  confetti: { fontSize: 22, marginBottom: 8 },
  completeEmoji: { fontSize: 48, marginBottom: 8 },
  completeTitle: { fontSize: 26, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary, marginBottom: 6 },
  completeSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24, fontFamily: 'Pretendard-Regular' },
  completeBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  completeBtnSecondary: {
    flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  completeBtnSecondaryText: { fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  completeBtnPrimary: {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  completeBtnPrimaryText: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: 'white' },
});
