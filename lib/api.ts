import { supabase } from './supabase';

// ── 인증 ─────────────────────────────────────────────────────
export const auth = {
  getSession: () => supabase.auth.getSession(),
  signOut: () => supabase.auth.signOut(),
  onAuthStateChange: (cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(cb),
};

// ── 사용자 ───────────────────────────────────────────────────
export const userApi = {
  getMe: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    return data;
  },

  upsert: async (payload: { id: string; provider: string; email?: string; nickname?: string; profile_image?: string }) => {
    const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  },
};

// ── 절 진척도 ─────────────────────────────────────────────────
export const progressApi = {
  getBookProgress: async (userId: string, bookId: string) => {
    const { data } = await supabase
      .from('verse_progress')
      .select('chapter, verse, fully_complete_at, completed_lines, total_lines')
      .eq('user_id', userId)
      .eq('book_id', bookId);
    return data ?? [];
  },

  upsertVerse: async (payload: {
    user_id: string;
    book_id: string;
    chapter: number;
    verse: number;
    language: 'ko' | 'en';
    completed_lines: number[];
    total_lines: number;
    fully_complete_at?: string | null;
    rub_count?: number;
  }) => {
    const { data, error } = await supabase
      .from('verse_progress')
      .upsert(payload, { onConflict: 'user_id,book_id,chapter,verse' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ── 모임 ─────────────────────────────────────────────────────
export const groupApi = {
  getMyGroups: async (userId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('user_id', userId);
    return data?.map(d => d.groups) ?? [];
  },

  joinByCode: async (code: string, userId: string) => {
    const { data: group, error: gErr } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', code.toUpperCase())
      .single();
    if (gErr || !group) throw new Error('유효하지 않은 모임 코드입니다.');

    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
    if (error) throw error;
    return group;
  },

  joinByLink: async (token: string, userId: string) => {
    const { data: link, error: lErr } = await supabase
      .from('group_invite_links')
      .select('group_id, expires_at')
      .eq('token', token)
      .single();
    if (lErr || !link) throw new Error('유효하지 않은 초대 링크입니다.');
    if (new Date(link.expires_at) < new Date()) throw new Error('만료된 초대 링크입니다.');

    const { error } = await supabase.from('group_members').insert({ group_id: link.group_id, user_id: userId });
    if (error) throw error;
    return link.group_id;
  },

  getGroupProgress: async (groupId: string) => {
    const { data } = await supabase
      .from('group_member_progress')
      .select('*')
      .eq('group_id', groupId);
    return data ?? [];
  },

  sendReaction: async (payload: { group_id: string; from_user: string; to_user: string; emoji: string }) => {
    const { error } = await supabase.from('group_reactions').insert(payload);
    if (error) throw error;
  },

  sendMessage: async (payload: { group_id: string; from_user: string; to_user?: string; content: string }) => {
    const { error } = await supabase.from('group_messages').insert(payload);
    if (error) throw error;
  },
};
