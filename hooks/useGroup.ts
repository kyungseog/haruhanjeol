import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  Group, GroupMember, FeedItem,
  getMyGroups, getGroupProgress, getGroupFeed,
} from '@/lib/groupApi';

// 내 모임 목록
export function useMyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setGroups(await getMyGroups(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { groups, loading, reload: load };
}

// 특정 모임의 멤버 진척도 + 피드
export function useGroupDetail(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [m, f] = await Promise.all([
        getGroupProgress(groupId),
        getGroupFeed(groupId),
      ]);
      setMembers(m);
      setFeed(f);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);
  return { members, feed, loading, reload: load };
}
