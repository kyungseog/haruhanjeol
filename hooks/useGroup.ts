import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  Group, GroupMember, FeedItem, GroupGoalSummary,
  getMyGroups, getGroupProgress, getGroupFeed,
  getGroupGoalSummary, getGroupTodayCompleted, getGroupMembersTodayProgress,
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

// 특정 모임의 멤버 진척도 + 피드 + 목표 요약
export function useGroupDetail(groupId: string | null, isShared: boolean = false) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [goalSummary, setGoalSummary] = useState<GroupGoalSummary | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [membersTodayProgress, setMembersTodayProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      if (isShared) {
        const [m, f, g, t, mp] = await Promise.all([
          getGroupProgress(groupId),
          getGroupFeed(groupId),
          getGroupGoalSummary(groupId),
          getGroupTodayCompleted(groupId),
          getGroupMembersTodayProgress(groupId),
        ]);
        setMembers(m);
        setFeed(f);
        setGoalSummary(g);
        setTodayTotal(t);
        setMembersTodayProgress(mp);
      } else {
        const [m, f] = await Promise.all([
          getGroupProgress(groupId),
          getGroupFeed(groupId),
        ]);
        setMembers(m);
        setFeed(f);
        setGoalSummary(null);
        setTodayTotal(0);
        setMembersTodayProgress({});
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, isShared]);

  useEffect(() => { load(); }, [load]);
  return { members, feed, goalSummary, todayTotal, membersTodayProgress, loading, reload: load };
}
