import { supabase } from './supabase';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  max_members: number;
  created_by: string | null;
  created_at: string;
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

// 내 모임 목록
export async function getMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((d: any) => d.groups).filter(Boolean);
}

// 모임 상세 + 멤버 수
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

// 모임 생성 (RPC — 생성자 자동 멤버 추가)
export async function createGroup(name: string, description?: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('create_group', { p_name: name, p_description: description ?? null });
  if (error) throw error;
  return data as string; // group_id
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
  return data as string; // token
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
