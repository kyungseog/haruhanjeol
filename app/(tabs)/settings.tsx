import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/lib/langContext';
import { useAllProgress } from '@/hooks/useProgress';
import {
  getGoalSettings,
  saveGoalSettings,
  scheduleReminderNotification,
  cancelReminderNotification,
  calcDaysToFinish,
  calcVersesPerDay,
  formatDaysToFinish,
} from '@/lib/goalService';

const TOTAL_VERSES = 31103;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLang();
  const { totalProgress, loading: progressLoading } = useAllProgress();
  const [notifyGroup, setNotifyGroup] = useState(true);
  const [notifyCheer, setNotifyCheer] = useState(true);

  // 목표량 설정
  const [goalMode, setGoalMode] = useState<'verses' | 'date'>('verses');
  const [dailyGoalVerses, setDailyGoalVerses] = useState<number>(5);
  const [hasGoal, setHasGoal] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 알림 설정
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(21);
  const [reminderMinute, setReminderMinute] = useState(0);

  const completedVerses = Math.round(totalProgress * TOTAL_VERSES);

  useEffect(() => {
    if (!user) return;
    getGoalSettings(user.id).then(s => {
      if (s.dailyGoalVerses !== null) {
        setDailyGoalVerses(s.dailyGoalVerses);
        setHasGoal(true);
        setGoalMode('verses');
      } else if (s.goalTargetDate !== null) {
        setTargetDate(new Date(s.goalTargetDate));
        setHasGoal(true);
        setGoalMode('date');
      }
      setReminderEnabled(s.reminderEnabled);
      setReminderHour(s.reminderHour);
      setReminderMinute(s.reminderMinute);
    });
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleGoalModeChange = (mode: 'verses' | 'date') => {
    setGoalMode(mode);
    setHasGoal(false);
  };

  const handleDailyVersesChange = (delta: number) => {
    const next = Math.min(50, Math.max(1, dailyGoalVerses + delta));
    setDailyGoalVerses(next);
    setHasGoal(true);
    if (user) saveGoalSettings(user.id, { dailyGoalVerses: next, goalTargetDate: null });
  };

  // Android: onChange fires on confirm/cancel (dialog auto-closes)
  // iOS: onChange fires on every scroll; confirm via modal "확인" button
  const [pendingDate, setPendingDate] = useState<Date>(targetDate);

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) {
      setShowDatePicker(false);
      return;
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setTargetDate(date);
      setHasGoal(true);
      const iso = date.toISOString().split('T')[0];
      if (user) saveGoalSettings(user.id, { goalTargetDate: iso, dailyGoalVerses: null });
    } else {
      setPendingDate(date);
    }
  };

  const confirmIOSDate = () => {
    setShowDatePicker(false);
    setTargetDate(pendingDate);
    setHasGoal(true);
    const iso = pendingDate.toISOString().split('T')[0];
    if (user) saveGoalSettings(user.id, { goalTargetDate: iso, dailyGoalVerses: null });
  };

  const handleReminderToggle = async (val: boolean) => {
    setReminderEnabled(val);
    if (!user) return;
    await saveGoalSettings(user.id, { reminderEnabled: val });
    if (val) {
      await scheduleReminderNotification(reminderHour, reminderMinute);
    } else {
      await cancelReminderNotification();
    }
  };

  const handleReminderHourChange = async (delta: number) => {
    const next = (reminderHour + delta + 24) % 24;
    setReminderHour(next);
    if (!user) return;
    await saveGoalSettings(user.id, { reminderHour: next });
    if (reminderEnabled) await scheduleReminderNotification(next, reminderMinute);
  };

  const handleReminderMinuteChange = async (delta: number) => {
    const next = (reminderMinute + delta + 60) % 60;
    setReminderMinute(next);
    if (!user) return;
    await saveGoalSettings(user.id, { reminderMinute: next });
    if (reminderEnabled) await scheduleReminderNotification(reminderHour, next);
  };

  const daysToFinish = goalMode === 'verses' && hasGoal
    ? calcDaysToFinish(dailyGoalVerses, completedVerses)
    : null;

  const versesPerDay = goalMode === 'date' && hasGoal
    ? calcVersesPerDay(targetDate, completedVerses)
    : null;

  const progressPct = progressLoading ? 0 : totalProgress;
  const pctLabel = (progressPct * 100).toFixed(1) + '%';

  const hourLabel = reminderHour < 12
    ? `오전 ${reminderHour === 0 ? 12 : reminderHour}시`
    : `오후 ${reminderHour === 12 ? 12 : reminderHour - 12}시`;

  const minLabel = String(reminderMinute).padStart(2, '0') + '분';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>
      <ScrollView>
        {/* 프로필 */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <MaterialIcons name="account-circle" size={36} color={Colors.brand} />
          </View>
          <View>
            <Text style={styles.profileName}>{user?.user_metadata?.nickname ?? user?.email?.split('@')[0] ?? '사용자'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* 기본 언어 */}
        <Text style={styles.groupLabel}>기본 언어</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>성경 언어</Text>
          <View style={styles.segControl}>
            {([['ko', '한글'], ['en', 'ENG']] as const).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[styles.segOption, lang === val && styles.segOptionActive]}
                onPress={() => setLang(val)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segText, lang === val && styles.segTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 하루 목표량 */}
        <Text style={styles.groupLabel}>하루 목표량</Text>
        <View style={styles.goalCard}>
          {/* 모드 토글 */}
          <View style={styles.goalModeRow}>
            {(['verses', 'date'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.goalModeBtn, goalMode === m && styles.goalModeBtnActive]}
                onPress={() => handleGoalModeChange(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.goalModeBtnText, goalMode === m && styles.goalModeBtnTextActive]}>
                  {m === 'verses' ? '절 수로 설정' : '완성 날짜로 설정'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {goalMode === 'verses' ? (
            <View style={styles.goalVerseRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => handleDailyVersesChange(-1)}>
                <MaterialIcons name="remove" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.stepValue}>
                <Text style={styles.stepValueText}>{dailyGoalVerses}절</Text>
                <Text style={styles.stepValueSub}>/ 일</Text>
              </View>
              <TouchableOpacity style={styles.stepBtn} onPress={() => handleDailyVersesChange(1)}>
                <MaterialIcons name="add" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.datePickerRow}
              onPress={() => { setPendingDate(targetDate); setShowDatePicker(true); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="calendar-today" size={18} color={Colors.brand} />
              <Text style={styles.datePickerText}>
                {targetDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Android: dialog 방식으로 자동 닫힘 */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* iOS: 모달 안에 spinner + 확인 버튼 */}
          <Modal
            visible={showDatePicker && Platform.OS === 'ios'}
            transparent
            animationType="slide"
          >
            <View style={styles.dateModalOverlay}>
              <View style={styles.dateModalCard}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalCancel}>취소</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>완성 날짜 선택</Text>
                  <TouchableOpacity onPress={confirmIOSDate}>
                    <Text style={styles.dateModalConfirm}>확인</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pendingDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  locale="ko-KR"
                  style={styles.datePickerSpinner}
                />
              </View>
            </View>
          </Modal>

          {hasGoal && (
            <View style={styles.goalResult}>
              <MaterialIcons name="info-outline" size={14} color={Colors.brand} />
              <Text style={styles.goalResultText}>
                {goalMode === 'verses' && daysToFinish !== null
                  ? formatDaysToFinish(daysToFinish)
                  : versesPerDay !== null
                    ? `하루에 약 ${versesPerDay}절을 써야 해요`
                    : ''}
              </Text>
            </View>
          )}
        </View>

        {/* 쓰기 알림 */}
        <Text style={styles.groupLabel}>쓰기 알림</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>목표 미달성 알림</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={handleReminderToggle}
            trackColor={{ true: Colors.brand }}
          />
        </View>
        {reminderEnabled && (
          <View style={styles.reminderTimeCard}>
            <Text style={styles.reminderTimeLabel}>알림 시각</Text>
            <View style={styles.reminderTimeRow}>
              <View style={styles.timeUnit}>
                <TouchableOpacity style={styles.timeStepBtn} onPress={() => handleReminderHourChange(1)}>
                  <MaterialIcons name="keyboard-arrow-up" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{hourLabel}</Text>
                <TouchableOpacity style={styles.timeStepBtn} onPress={() => handleReminderHourChange(-1)}>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeUnit}>
                <TouchableOpacity style={styles.timeStepBtn} onPress={() => handleReminderMinuteChange(10)}>
                  <MaterialIcons name="keyboard-arrow-up" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{minLabel}</Text>
                <TouchableOpacity style={styles.timeStepBtn} onPress={() => handleReminderMinuteChange(-10)}>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 모임/응원 알림 */}
        <Text style={styles.groupLabel}>알림</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>모임 활동 알림</Text>
          <Switch value={notifyGroup} onValueChange={setNotifyGroup} trackColor={{ true: Colors.brand }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>완료 응원 알림</Text>
          <Switch value={notifyCheer} onValueChange={setNotifyCheer} trackColor={{ true: Colors.brand }} />
        </View>

        {/* 내 진척도 */}
        <Text style={styles.groupLabel}>내 진척도</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>전체 31,103절 중</Text>
            <Text style={styles.progressPct}>{pctLabel}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPct * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressSub}>{completedVerses.toLocaleString()}절 완료</Text>
        </View>

        {/* 계정 */}
        <Text style={styles.groupLabel}>계정</Text>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Text style={[styles.rowLabel, { color: Colors.textSecondary }]}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.rowLabel, { color: '#FF3B30' }]}>회원 탈퇴</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, margin: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  groupLabel: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    fontSize: 12, fontFamily: 'Pretendard-Bold', color: Colors.textTertiary, letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary },
  segControl: {
    flexDirection: 'row', backgroundColor: Colors.border,
    borderRadius: 20, padding: 3, gap: 2,
  },
  segOption: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16 },
  segOptionActive: {
    backgroundColor: Colors.brand,
    shadowColor: Colors.brand, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  segText: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textTertiary },
  segTextActive: { color: 'white' },

  // 목표량 카드
  goalCard: {
    backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  goalModeRow: { flexDirection: 'row' },
  goalModeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  goalModeBtnActive: { borderBottomColor: Colors.brand },
  goalModeBtnText: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textTertiary },
  goalModeBtnTextActive: { color: Colors.brand },
  goalVerseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingVertical: 20,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { alignItems: 'center', minWidth: 80 },
  stepValueText: { fontSize: 28, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  stepValueSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  datePickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 18,
  },
  datePickerText: { flex: 1, fontSize: 16, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  goalResult: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.brandLight, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  goalResultText: { fontSize: 13, color: Colors.brandGold, fontFamily: 'Pretendard-SemiBold' },

  // 날짜 모달 (iOS)
  dateModalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateModalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  dateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateModalTitle: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  dateModalCancel: { fontSize: 15, color: Colors.textSecondary, fontFamily: 'Pretendard-Regular' },
  dateModalConfirm: { fontSize: 15, color: Colors.brand, fontFamily: 'Pretendard-Bold' },
  datePickerSpinner: { width: '100%' },

  // 알림 시각
  reminderTimeCard: {
    backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  reminderTimeLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12, fontFamily: 'Pretendard-Medium' },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timeUnit: { alignItems: 'center', gap: 4, minWidth: 80 },
  timeStepBtn: { padding: 4 },
  timeValue: { fontSize: 20, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  timeColon: { fontSize: 22, fontFamily: 'Pretendard-Bold', color: Colors.textTertiary, marginBottom: 4 },

  // 진척도 카드
  progressCard: {
    backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  progressPct: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brand, borderRadius: 4 },
  progressSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
});
