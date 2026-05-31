import { supabase } from './supabase';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  max_members: number;
  created_by: string | null;
  created_at: string;
  group_type: 'independent' | 'shared';
  group_daily_goal: number | null;
  group_target_date: string | null;
  split_mode: 'equal' | 'custom' | null;
  goal_set_at: string | null;
};

export type GroupMember = {
  user_id: string;
  nickname: string | null;
  profile_image: string | null;
  completed_verses: number;
  progress_pct: number;
};

export type FeedItem = {
  user_id: string;
  nickname: string | null;
  profile_image: string | null;
  book_id: string;
  chapter: number;
  verse: number;
  completed_at: string;
};

export type GroupGoalSummary = {
  groupDailyGoal: number | null;
  groupTargetDate: string | null;
  splitMode: 'equal' | 'custom' | null;
  members: { userId: string; nickname: string | null; assignedVerses: number | null }[];
};

export type GroupGoalInput = {
  dailyGoal?: number;
  targetDate?: string;
  splitMode: 'equal' | 'custom';
  memberGoals?: Record<string, number>;
};

// 내 모임 목록
export async function getMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((d: any) => d.groups).filter(Boolean);
}

// 모임 상세
export async function getGroupDetail(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error) throw error;
  return data;
}

// 멤버 진척도 (뷰)
export async function getGroupProgress(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_member_progress')
    .select('*')
    .eq('group_id', groupId)
    .order('progress_pct', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    nickname: r.nickname,
    profile_image: r.profile_image,
    completed_verses: Number(r.completed_verses ?? 0),
    progress_pct: Number(r.progress_pct ?? 0),
  }));
}

// 최근 활동 피드 (RPC)
export async function getGroupFeed(groupId: string, limit = 20): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .rpc('get_group_feed', { p_group_id: groupId, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

// 모임 생성 (RPC)
export async function createGroup(
  name: string,
  description?: string,
  groupType: 'independent' | 'shared' = 'independent',
): Promise<string> {
  const { data, error } = await supabase
    .rpc('create_group', {
      p_name: name,
      p_description: description ?? null,
      p_group_type: groupType,
    });
  if (error) throw error;
  return data as string;
}

// 딥링크 토큰으로 참여
export async function joinByToken(token: string): Promise<Group> {
  const { data: groupId, error } = await supabase
    .rpc('join_by_token', { p_token: token });
  if (error) throw new Error(error.message);

  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (gErr || !group) throw new Error('모임 정보를 불러오지 못했습니다.');
  return group;
}

// 코드로 참여
export async function joinByCode(code: string): Promise<Group> {
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.trim().toUpperCase())
    .single();
  if (gErr || !group) throw new Error('유효하지 않은 모임 코드입니다.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id });
  if (error) {
    if (error.code === '23505') throw new Error('이미 참여 중인 모임입니다.');
    throw error;
  }
  return group;
}

// 초대 링크 생성 (RPC)
export async function createInviteLink(groupId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('create_invite_link', { p_group_id: groupId });
  if (error) throw error;
  return data as string;
}

// 이모지 반응
export async function sendReaction(groupId: string, toUserId: string, emoji: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('group_reactions').insert({
    group_id: groupId, from_user: user.id, to_user: toUserId, emoji,
  });
  if (error) throw error;
}

// 응원 메시지
export async function sendMessage(groupId: string, content: string, toUserId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('group_messages').insert({
    group_id: groupId, from_user: user.id, to_user: toUserId ?? null, content,
  });
  if (error) throw error;
}

// 모임 삭제 (생성자 전용)
export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

// 멤버 내보내기 (생성자 전용)
export async function kickMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

// 모임 목표 설정 (방장 전용)
export async function setGroupGoal(groupId: string, input: GroupGoalInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: groupData, error: gErr } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single();
  if (gErr || !groupData) throw new Error('모임 정보를 불러올 수 없습니다.');
  if (groupData.created_by !== user.id) throw new Error('방장만 목표를 설정할 수 있어요.');

  // 날짜 모드면 하루 필요 절 수 계산
  const totalGoal = input.dailyGoal ?? (() => {
    if (!input.targetDate) return 1;
    const daysLeft = Math.max(1, Math.ceil(
      (new Date(input.targetDate).getTime() - Date.now()) / 86400000,
    ));
    return Math.ceil(31103 / daysLeft);
  })();

  const { error: updateErr } = await supabase
    .from('groups')
    .update({
      group_daily_goal: totalGoal,
      group_target_date: input.targetDate ?? null,
      split_mode: input.splitMode,
      goal_set_at: new Date().toISOString(),
    })
    .eq('id', groupId);
  if (updateErr) throw updateErr;

  // 멤버 조회
  const { data: membersData, error: mErr } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (mErr) throw mErr;
  const members = membersData ?? [];

  if (input.splitMode === 'equal') {
    const count = members.length || 1;
    const base = Math.floor(totalGoal / count);
    const remainder = totalGoal - base * count;
    await Promise.all(members.map(m =>
      supabase.from('group_members')
        .update({
          assigned_verses: base + (m.user_id === groupData.created_by ? remainder : 0),
        })
        .eq('group_id', groupId)
        .eq('user_id', m.user_id),
    ));
  } else if (input.memberGoals) {
    await Promise.all(
      Object.entries(input.memberGoals).map(([userId, verses]) =>
        supabase.from('group_members')
          .update({ assigned_verses: verses })
          .eq('group_id', groupId)
          .eq('user_id', userId),
      ),
    );
  }
}

// 모임 목표 + 멤버 할당량 조회
export async function getGroupGoalSummary(groupId: string): Promise<GroupGoalSummary> {
  const [groupRes, membersRes, progressRes] = await Promise.all([
    supabase.from('groups')
      .select('group_daily_goal, group_target_date, split_mode')
      .eq('id', groupId)
      .single(),
    supabase.from('group_members')
      .select('user_id, assigned_verses')
      .eq('group_id', groupId),
    supabase.from('group_member_progress')
      .select('user_id, nickname')
      .eq('group_id', groupId),
  ]);

  const nicknameMap: Record<string, string | null> = {};
  (progressRes.data ?? []).forEach((p: any) => { nicknameMap[p.user_id] = p.nickname; });

  return {
    groupDailyGoal: groupRes.data?.group_daily_goal ?? null,
    groupTargetDate: groupRes.data?.group_target_date ?? null,
    splitMode: groupRes.data?.split_mode ?? null,
    members: (membersRes.data ?? []).map((m: any) => ({
      userId: m.user_id,
      nickname: nicknameMap[m.user_id] ?? null,
      assignedVerses: m.assigned_verses ?? null,
    })),
  };
}

// 오늘 모임 전체 완료 절 수 (분담형 진척 표시용)
export async function getGroupTodayCompleted(groupId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: memberData } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const memberIds = (memberData ?? []).map((m: any) => m.user_id);
  if (!memberIds.length) return 0;

  const { count } = await supabase
    .from('verse_progress')
    .select('id', { count: 'exact', head: true })
    .in('user_id', memberIds)
    .gte('fully_complete_at', today.toISOString())
    .not('fully_complete_at', 'is', null);

  return count ?? 0;
}

// 멤버별 오늘 완료 절 수 (분담형 멤버 진척도용)
export async function getGroupMembersTodayProgress(groupId: string): Promise<Record<string, number>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: memberData } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const memberIds = (memberData ?? []).map((m: any) => m.user_id);
  if (!memberIds.length) return {};

  const { data } = await supabase
    .from('verse_progress')
    .select('user_id')
    .in('user_id', memberIds)
    .gte('fully_complete_at', today.toISOString())
    .not('fully_complete_at', 'is', null);

  const result: Record<string, number> = {};
  for (const id of memberIds) result[id] = 0;
  for (const row of (data ?? [])) {
    result[row.user_id] = (result[row.user_id] ?? 0) + 1;
  }
  return result;
}
