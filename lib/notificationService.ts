import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 포그라운드 알림 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 권한 요청 + 토큰 등록
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  );
}

// Edge Function 호출 헬퍼
async function sendPush(toUserIds: string[], title: string, body: string, data?: object) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token || !toUserIds.length) return;

  const { data: { publicUrl } } = supabase.storage.from('').getPublicUrl('');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

  await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ toUserIds, title, body, data }),
  }).catch(() => {}); // 알림 실패가 메인 플로우를 막지 않도록
}

// 모임 멤버들에게 절 완료 알림
export async function notifyGroupVerseComplete(params: {
  groupId: string;
  completedByUserId: string;
  completedByNickname: string;
  bookName: string;
  chapter: number;
  verse: number;
}) {
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', params.groupId)
    .neq('user_id', params.completedByUserId);

  const toUserIds = (members ?? []).map(m => m.user_id);
  if (!toUserIds.length) return;

  await sendPush(
    toUserIds,
    `${params.completedByNickname}님이 완료했어요 ✏️`,
    `${params.bookName} ${params.chapter}:${params.verse}`,
    { groupId: params.groupId },
  );
}

// 반응(응원) 알림
export async function notifyReaction(params: {
  toUserId: string;
  fromNickname: string;
}) {
  await sendPush(
    [params.toUserId],
    `${params.fromNickname}님이 응원을 보냈어요 👍`,
    '하루한절 앱에서 확인하세요',
  );
}

// 내가 속한 모든 모임 멤버에게 절 완료 알림 (중복 제거)
export async function notifyVerseComplete(params: {
  userId: string;
  nickname: string;
  bookName: string;
  chapter: number;
  verse: number;
}): Promise<void> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', params.userId);

  if (!memberships?.length) return;

  const groupIds = memberships.map(m => m.group_id);

  const { data: otherMembers } = await supabase
    .from('group_members')
    .select('user_id')
    .in('group_id', groupIds)
    .neq('user_id', params.userId);

  const toUserIds = [...new Set((otherMembers ?? []).map(m => m.user_id))];
  if (!toUserIds.length) return;

  await sendPush(
    toUserIds,
    `${params.nickname}님이 완료했어요 ✏️`,
    `${params.bookName} ${params.chapter}:${params.verse}`,
  );
}
