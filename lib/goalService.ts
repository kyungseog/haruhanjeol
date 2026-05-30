import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

export type GoalSettings = {
  dailyGoalVerses: number | null;
  goalTargetDate: string | null; // ISO date string 'YYYY-MM-DD'
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
};

const REMINDER_ID_KEY = 'goal_reminder_notification_id';
const TOTAL_VERSES = 31103;

export async function getGoalSettings(userId: string): Promise<GoalSettings> {
  const { data } = await supabase
    .from('users')
    .select('daily_goal_verses, goal_target_date, reminder_enabled, reminder_hour, reminder_minute')
    .eq('id', userId)
    .single();

  return {
    dailyGoalVerses: data?.daily_goal_verses ?? null,
    goalTargetDate: data?.goal_target_date ?? null,
    reminderEnabled: data?.reminder_enabled ?? false,
    reminderHour: data?.reminder_hour ?? 21,
    reminderMinute: data?.reminder_minute ?? 0,
  };
}

export async function saveGoalSettings(userId: string, settings: Partial<GoalSettings>) {
  const payload: Record<string, unknown> = { id: userId };
  if (settings.dailyGoalVerses !== undefined) payload.daily_goal_verses = settings.dailyGoalVerses;
  if (settings.goalTargetDate !== undefined) payload.goal_target_date = settings.goalTargetDate;
  if (settings.reminderEnabled !== undefined) payload.reminder_enabled = settings.reminderEnabled;
  if (settings.reminderHour !== undefined) payload.reminder_hour = settings.reminderHour;
  if (settings.reminderMinute !== undefined) payload.reminder_minute = settings.reminderMinute;

  await supabase.from('users').upsert(payload, { onConflict: 'id' });

  if (settings.dailyGoalVerses !== undefined) {
    await AsyncStorage.setItem('goal_daily_verses', String(settings.dailyGoalVerses ?? ''));
  }
}

export async function getTodayCompletedCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('verse_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('fully_complete_at', todayStart.toISOString());

  return count ?? 0;
}

export async function scheduleReminderNotification(hour: number, minute: number) {
  await cancelReminderNotification();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '하루한절 ✍️',
      body: '오늘의 쓰기 목표를 아직 완료하지 않았어요. 잠깐 말씀을 써볼까요?',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });

  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  return id;
}

export async function cancelReminderNotification() {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }
}

export async function cancelTodayReminderIfGoalMet(userId: string, dailyGoal: number | null) {
  if (!dailyGoal) return;
  const todayCount = await getTodayCompletedCount(userId);
  if (todayCount >= dailyGoal) {
    await cancelReminderNotification();
  }
}

// 절 수 입력 → 완성까지 남은 일수
export function calcDaysToFinish(dailyGoalVerses: number, completedVerses: number): number {
  const remaining = Math.max(TOTAL_VERSES - completedVerses, 0);
  if (dailyGoalVerses <= 0) return 0;
  return Math.ceil(remaining / dailyGoalVerses);
}

// 목표 날짜 → 하루 필요 절 수
export function calcVersesPerDay(targetDate: Date, completedVerses: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return TOTAL_VERSES;
  const remaining = Math.max(TOTAL_VERSES - completedVerses, 0);
  return Math.ceil(remaining / daysLeft);
}

export function formatDaysToFinish(days: number): string {
  if (days <= 0) return '이미 완성했어요! 🎉';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainDays = days % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}년`);
  if (months > 0) parts.push(`${months}개월`);
  if (remainDays > 0 && years === 0) parts.push(`${remainDays}일`);
  return `약 ${parts.join(' ')} 걸려요`;
}
