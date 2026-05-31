import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, RefreshControl,
  Modal, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, useGroupDetail } from '@/hooks/useGroup';
import {
  Group, GroupGoalSummary, GroupMember,
  createGroup, joinByCode, createInviteLink, sendReaction,
  deleteGroup, kickMember, setGroupGoal,
} from '@/lib/groupApi';
import { getBookById } from '@/constants/bible';
import { notifyReaction } from '@/lib/notificationService';
import { calcDaysToFinish, calcVersesPerDay, formatDaysToFinish } from '@/lib/goalService';

const TOTAL_VERSES = 31103;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const AVATAR_COLORS = ['#F5A623','#4CAF50','#2196F3','#9C27B0','#E91E63','#FF5722','#00BCD4','#8BC34A'];
function avatarColor(userId: string) {
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initial(nickname: string | null) {
  return (nickname ?? '?').charAt(0);
}

// ──────────────────────────────��─────────────────────────────
export default function GroupScreen() {
  const { user } = useAuth();
  const { groups, loading: groupsLoading, reload: reloadGroups } = useMyGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null;
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;
  const isShared = activeGroup?.group_type === 'shared';

  const { members, feed, goalSummary, todayTotal, membersTodayProgress, loading: detailLoading, reload: reloadDetail } =
    useGroupDetail(activeGroupId, isShared);

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabs}
          contentContainerStyle={styles.groupTabsContent}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupTab, g.id === activeGroupId && styles.groupTabActive]}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Text style={[styles.groupTabText, g.id === activeGroupId && styles.groupTabTextActive]}>
                {g.group_type === 'shared' ? '🤝 ' : ''}{g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {groups.length === 0 ? (
        <EmptyGroupView
          onCreate={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
        />
      ) : activeGroup ? (
        <GroupHomeView
          group={activeGroup}
          members={members}
          feed={feed}
          goalSummary={goalSummary}
          todayTotal={todayTotal}
          membersTodayProgress={membersTodayProgress}
          loading={detailLoading}
          currentUserId={user?.id ?? ''}
          currentUserNickname={user?.user_metadata?.nickname ?? user?.email?.split('@')[0] ?? '익명'}
          isCreator={activeGroup.created_by === user?.id}
          onReload={async () => { await Promise.all([reloadDetail(), reloadGroups()]); }}
          onGroupDeleted={async () => {
            await reloadGroups();
            setSelectedGroupId(null);
          }}
          onJoin={() => setShowJoin(true)}
          onInvite={async () => {
            try {
              const token = await createInviteLink(activeGroup.id);
              const url = `haruhanjeol://join/${token}`;
              await Share.share({ message: `하루한절 모임 초대\n코드: ${activeGroup.invite_code}\n링크: ${url}` });
            } catch (e: any) {
              Alert.alert('오류', e.message);
            }
          }}
        />
      ) : null}

      {groups.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.newGroupBtn} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={18} color={Colors.brand} />
            <Text style={styles.newGroupBtnText}>새 모임 만들기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newGroupBtn} onPress={() => setShowJoin(true)}>
            <MaterialIcons name="login" size={18} color={Colors.brand} />
            <Text style={styles.newGroupBtnText}>코드로 참여</Text>
          </TouchableOpacity>
        </View>
      )}

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async (groupId) => {
          setShowCreate(false);
          await reloadGroups();
          setSelectedGroupId(groupId);
        }}
      />

      <JoinGroupModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={async (groupId) => {
          setShowJoin(false);
          await reloadGroups();
          setSelectedGroupId(groupId);
        }}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────��───
function EmptyGroupView({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <View style={styles.center}>
      <MaterialIcons name="group" size={56} color={Colors.border} />
      <Text style={styles.emptyTitle}>아직 모임이 없어요</Text>
      <Text style={styles.emptyDesc}>함께 성경을 써볼 사람을 모아보세요</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onCreate}>
        <MaterialIcons name="add" size={18} color="white" />
        <Text style={styles.primaryBtnText}>모임 만들기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onJoin}>
        <MaterialIcons name="vpn-key" size={16} color={Colors.brand} />
        <Text style={styles.secondaryBtnText}>코드로 참여하기</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
function GroupHomeView({
  group, members, feed, goalSummary, todayTotal, membersTodayProgress, loading,
  currentUserId, currentUserNickname, isCreator,
  onReload, onGroupDeleted, onJoin, onInvite,
}: {
  group: Group;
  members: GroupMember[];
  feed: any[];
  goalSummary: GroupGoalSummary | null;
  todayTotal: number;
  membersTodayProgress: Record<string, number>;
  loading: boolean;
  currentUserId: string;
  currentUserNickname: string;
  isCreator: boolean;
  onReload: () => void;
  onGroupDeleted: () => void;
  onJoin: () => void;
  onInvite: () => void;
}) {
  const handleReaction = async (toUserId: string) => {
    try {
      await sendReaction(group.id, toUserId, '👍');
      notifyReaction({ toUserId, fromNickname: currentUserNickname }).catch(() => {});
      Alert.alert('', '응원을 보냈어요! 👍');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const confirm = (message: string, onConfirm: () => Promise<void>) => {
    Alert.alert('확인', message, [
      { text: '취소', style: 'cancel' },
      { text: '확인', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const handleDeleteGroup = () => {
    confirm(
      `"${group.name}" 모임을 삭제하시겠습니까?\n모든 멤버와 데이터가 삭제됩니다.`,
      async () => {
        await deleteGroup(group.id);
        onGroupDeleted();
      },
    );
  };

  const handleKickMember = (member: any) => {
    confirm(
      `"${member.nickname ?? '익명'}"을(를) 모임에서 내보내시겠습니까?`,
      async () => {
        await kickMember(group.id, member.user_id);
        await onReload();
      },
    );
  };

  const isShared = group.group_type === 'shared';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onReload} tintColor={Colors.brand} />
      }
    >
      {/* 헤더 */}
      <View style={styles.groupHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.groupNameRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            {isShared && (
              <View style={styles.sharedBadge}>
                <Text style={styles.sharedBadgeText}>🤝 함께 완성형</Text>
              </View>
            )}
          </View>
          <Text style={styles.groupCode}>초대 코드: {group.invite_code}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onInvite}>
            <MaterialIcons name="share" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          {isCreator && (
            <TouchableOpacity onPress={handleDeleteGroup}>
              <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <>
        {/* 오늘 모임 달성 현황 (분담형 + 목표 설정된 경우) */}
        {isShared && group.group_daily_goal != null && (
          <View style={styles.todayProgress}>
            <View style={styles.todayProgressHeader}>
              <Text style={styles.todayProgressLabel}>오늘 모임 달성</Text>
              <Text style={styles.todayProgressCount}>
                {todayTotal} / {group.group_daily_goal}절
              </Text>
            </View>
            <View style={styles.todayProgressBg}>
              <View style={[
                styles.todayProgressFill,
                { width: `${Math.min((todayTotal / group.group_daily_goal) * 100, 100)}%` as any },
              ]} />
            </View>
          </View>
        )}

        {/* 멤버 진척도 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>멤버 진척도</Text>
          {members.length === 0 ? (
            <Text style={styles.emptyDesc}>아직 멤버가 없습니다.</Text>
          ) : members.map(m => {
            const assignedVerses = isShared
              ? goalSummary?.members.find(gm => gm.userId === m.user_id)?.assignedVerses ?? null
              : null;
            const todayCount = membersTodayProgress[m.user_id] ?? 0;
            const todayPct = (isShared && assignedVerses)
              ? Math.min((todayCount / assignedVerses) * 100, 100)
              : Math.min(m.progress_pct, 100);
            return (
            <View key={m.user_id} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: avatarColor(m.user_id) }]}>
                <Text style={styles.avatarText}>{initial(m.nickname)}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>
                    {m.nickname ?? '익명'}{m.user_id === currentUserId ? ' (나)' : ''}
                  </Text>
                  {isShared && assignedVerses != null ? (
                    <Text style={styles.memberTodayVerses}>
                      오늘 {todayCount}/{assignedVerses}절
                    </Text>
                  ) : (
                    <Text style={styles.memberVerses}>{m.completed_verses.toLocaleString()}절</Text>
                  )}
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${todayPct}%` as any }]} />
                </View>
                {isShared && (
                  <Text style={styles.memberCumulative}>
                    총 누적 작성 {m.completed_verses.toLocaleString()}절
                  </Text>
                )}
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.cheerBtn}
                  onPress={() => handleReaction(m.user_id)}
                  disabled={m.user_id === currentUserId}
                >
                  <MaterialIcons
                    name="thumb-up"
                    size={16}
                    color={m.user_id === currentUserId ? Colors.border : Colors.brand}
                  />
                </TouchableOpacity>
                {isCreator && m.user_id !== currentUserId && (
                  <TouchableOpacity
                    style={styles.kickBtn}
                    onPress={() => handleKickMember(m)}
                  >
                    <MaterialIcons name="person-remove" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            );
          })}
        </View>

        {/* 모임 목표 섹션 (분담형만) */}
        {isShared && (
          <GroupGoalSection
            groupId={group.id}
            group={group}
            goalSummary={goalSummary}
            isCreator={isCreator}
            currentUserId={currentUserId}
            onSaved={onReload}
          />
        )}

        {/* 최근 활동 피드 */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>최근 활동</Text>
          {feed.length === 0 ? (
            <Text style={styles.emptyDesc}>아직 완료된 절이 없습니다.</Text>
          ) : feed.map((item, idx) => {
            const book = getBookById(item.book_id);
            const bookName = book?.name ?? item.book_id;
            return (
              <View key={idx} style={styles.feedItem}>
                <View style={styles.feedTop}>
                  <View style={[styles.avatarSm, { backgroundColor: avatarColor(item.user_id) }]}>
                    <Text style={styles.avatarSmText}>{initial(item.nickname)}</Text>
                  </View>
                  <Text style={styles.feedText}>
                    <Text style={styles.feedUser}>{item.nickname ?? '익명'}</Text>
                    {`님이 ${bookName} ${item.chapter}:${item.verse}을 썼어요 ✏️`}
                  </Text>
                  <Text style={styles.feedTime}>{timeAgo(item.completed_at)}</Text>
                </View>
                <View style={styles.feedActions}>
                  <TouchableOpacity
                    style={styles.feedAction}
                    onPress={() => handleReaction(item.user_id)}
                  >
                    <MaterialIcons name="thumb-up" size={13} color={Colors.brand} />
                    <Text style={styles.feedActionText}>응원</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 80 }} />
      </>
    </ScrollView>
  );
}

// ────────────────────────────────────────────────���───────────
function GroupGoalSection({
  groupId, group, goalSummary, isCreator, currentUserId, onSaved,
}: {
  groupId: string;
  group: Group;
  goalSummary: GroupGoalSummary | null;
  isCreator: boolean;
  currentUserId: string;
  onSaved: () => void;
}) {
  const hasGoal = goalSummary?.groupDailyGoal != null;
  const [editing, setEditing] = useState(!hasGoal && isCreator);
  const [goalMode, setGoalMode] = useState<'verses' | 'date'>('verses');
  const [totalGoal, setTotalGoal] = useState(goalSummary?.groupDailyGoal ?? 30);
  const [targetDate, setTargetDate] = useState<Date>(() => {
    if (goalSummary?.groupTargetDate) return new Date(goalSummary.groupTargetDate);
    const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d;
  });
  const [pendingDate, setPendingDate] = useState<Date>(targetDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(
    goalSummary?.splitMode ?? 'equal',
  );
  const [customGoals, setCustomGoals] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    (goalSummary?.members ?? []).forEach(m => {
      if (m.assignedVerses != null) init[m.userId] = m.assignedVerses;
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const memberCount = goalSummary?.members.length ?? 1;

  const daysToFinish = goalMode === 'verses'
    ? calcDaysToFinish(totalGoal, 0)
    : null;
  const versesPerDay = goalMode === 'date'
    ? calcVersesPerDay(targetDate, 0)
    : null;

  // 날짜 모드에서는 calcVersesPerDay 결과를 실효 총 목표로 사용
  const effectiveTotal = goalMode === 'date' ? (versesPerDay ?? totalGoal) : totalGoal;
  const equalShare = Math.floor(effectiveTotal / memberCount);

  const customTotal = Object.values(customGoals).reduce((a, b) => a + b, 0);
  const customValid = customTotal === effectiveTotal;

  const handleSave = async () => {
    if (splitMode === 'custom' && !customValid) {
      Alert.alert('', `할당량 합계(${customTotal}절)가 총 목표(${effectiveTotal}절)와 달라요.`);
      return;
    }
    setSaving(true);
    try {
      await setGroupGoal(groupId, {
        dailyGoal: goalMode === 'verses' ? totalGoal : undefined,
        targetDate: goalMode === 'date' ? targetDate.toISOString().split('T')[0] : undefined,
        splitMode,
        memberGoals: splitMode === 'custom' ? customGoals : undefined,
      });
      setEditing(false);
      onSaved();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) { setShowDatePicker(false); return; }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setTargetDate(date);
    } else {
      setPendingDate(date);
    }
  };

  const confirmIOSDate = () => {
    setShowDatePicker(false);
    setTargetDate(pendingDate);
  };

  // 일반 멤버: 내 할당량 카드
  if (!isCreator) {
    const myEntry = goalSummary?.members.find(m => m.userId === currentUserId);
    return (
      <View style={styles.section}>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>모임 목표</Text>
        {!hasGoal ? (
          <View style={styles.goalEmptyCard}>
            <MaterialIcons name="flag" size={28} color={Colors.border} />
            <Text style={styles.goalEmptyText}>아직 모임 목표가 없어요</Text>
            <Text style={styles.goalEmptyDesc}>방장이 설정하면 여기에 표시됩니다</Text>
          </View>
        ) : (
          <View style={styles.memberGoalCard}>
            <View style={styles.memberGoalRow}>
              <Text style={styles.memberGoalKey}>하루 총 목표</Text>
              <Text style={styles.memberGoalVal}>{goalSummary!.groupDailyGoal}절/일</Text>
            </View>
            <View style={styles.memberGoalRow}>
              <Text style={styles.memberGoalKey}>분담 방식</Text>
              <Text style={styles.memberGoalVal}>
                {goalSummary!.splitMode === 'equal' ? '균등 분담' : '개별 설정'}
              </Text>
            </View>
            {myEntry?.assignedVerses != null && (
              <View style={[styles.memberGoalRow, styles.memberGoalHighlight]}>
                <Text style={styles.memberGoalKeyBold}>내 할당량</Text>
                <Text style={styles.memberGoalValBold}>★ {myEntry.assignedVerses}절/일</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // 방장: 요약 보기
  if (!editing) {
    return (
      <View style={styles.section}>
        <View style={styles.divider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>모임 목표</Text>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editLink}>{hasGoal ? '수정' : '설정'}</Text>
          </TouchableOpacity>
        </View>
        {!hasGoal ? (
          <View style={styles.goalEmptyCard}>
            <MaterialIcons name="flag" size={28} color={Colors.border} />
            <Text style={styles.goalEmptyText}>모임 목표를 설정해보세요</Text>
            <Text style={styles.goalEmptyDesc}>멤버들에게 하루 할당량을 배분할 수 있어요</Text>
          </View>
        ) : (
          <View style={styles.memberGoalCard}>
            <View style={styles.memberGoalRow}>
              <Text style={styles.memberGoalKey}>하루 총 목표</Text>
              <Text style={styles.memberGoalVal}>{goalSummary!.groupDailyGoal}절/일</Text>
            </View>
            <View style={styles.memberGoalRow}>
              <Text style={styles.memberGoalKey}>분담 방식</Text>
              <Text style={styles.memberGoalVal}>
                {goalSummary!.splitMode === 'equal' ? '균등 분담' : '개별 설정'}
              </Text>
            </View>
            {goalSummary!.members.map(m => (
              <View key={m.userId} style={styles.memberGoalRow}>
                <Text style={styles.memberGoalKey}>
                  {m.nickname ?? '익명'}{m.userId === currentUserId ? ' (나)' : ''}
                </Text>
                <Text style={styles.memberGoalVal}>{m.assignedVerses ?? '-'}절</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // 방장: 편집 폼
  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>모임 목표</Text>

      <View style={styles.goalCard}>
        {/* 설정 방식 토글 */}
        <View style={styles.goalModeRow}>
          {(['verses', 'date'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.goalModeBtn, goalMode === m && styles.goalModeBtnActive]}
              onPress={() => setGoalMode(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.goalModeBtnText, goalMode === m && styles.goalModeBtnTextActive]}>
                {m === 'verses' ? '절 수로 설정' : '완성 날짜로 설정'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 총 목표 입력 */}
        {goalMode === 'verses' ? (
          <View style={styles.goalVerseRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setTotalGoal(Math.max(1, totalGoal - 1))}>
              <MaterialIcons name="remove" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepValueText}>{totalGoal}절</Text>
              <Text style={styles.stepValueSub}>모임 하루 총 목표</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setTotalGoal(totalGoal + 1)}>
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

        {/* Android DatePicker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        {/* iOS DatePicker 모달 */}
        <Modal visible={showDatePicker && Platform.OS === 'ios'} transparent animationType="slide">
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
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>

        {/* 계산 결과 */}
        {goalMode === 'verses' && (
          <View style={styles.goalResult}>
            <MaterialIcons name="info-outline" size={14} color={Colors.brand} />
            <Text style={styles.goalResultText}>{formatDaysToFinish(daysToFinish!)}</Text>
          </View>
        )}
        {goalMode === 'date' && versesPerDay != null && (
          <View style={styles.goalResult}>
            <MaterialIcons name="info-outline" size={14} color={Colors.brand} />
            <Text style={styles.goalResultText}>하루에 약 {versesPerDay}절을 써야 해요</Text>
          </View>
        )}

        {/* 분담 방식 */}
        <View style={styles.splitSection}>
          <Text style={styles.splitLabel}>분담 방식</Text>
          <View style={styles.goalModeRow}>
            {(['equal', 'custom'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.goalModeBtn, splitMode === m && styles.goalModeBtnActive]}
                onPress={() => setSplitMode(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.goalModeBtnText, splitMode === m && styles.goalModeBtnTextActive]}>
                  {m === 'equal' ? '균등 분담' : '개별 설정'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 균등 분담 안내 */}
        {splitMode === 'equal' && (
          <View style={styles.equalInfo}>
            <MaterialIcons name="info-outline" size={14} color={Colors.brand} />
            <Text style={styles.equalInfoText}>
              멤버 {memberCount}명 · 1인당 {equalShare}절
              {(effectiveTotal % memberCount) > 0 ? ` (나머지 ${effectiveTotal % memberCount}절은 방장에게)` : ''}
            </Text>
          </View>
        )}

        {/* 개별 설정 입력 */}
        {splitMode === 'custom' && goalSummary?.members.map(m => (
          <View key={m.userId} style={styles.customMemberRow}>
            <View style={[styles.avatarSm, { backgroundColor: avatarColor(m.userId) }]}>
              <Text style={styles.avatarSmText}>{initial(m.nickname)}</Text>
            </View>
            <Text style={styles.customMemberName} numberOfLines={1}>
              {m.nickname ?? '익명'}{m.userId === currentUserId ? ' (나)' : ''}
            </Text>
            <View style={styles.customStepRow}>
              <TouchableOpacity
                style={styles.stepBtnSm}
                onPress={() => setCustomGoals(prev => ({
                  ...prev,
                  [m.userId]: Math.max(0, (prev[m.userId] ?? 0) - 1),
                }))}
              >
                <MaterialIcons name="remove" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.customStepVal}>{customGoals[m.userId] ?? 0}절</Text>
              <TouchableOpacity
                style={styles.stepBtnSm}
                onPress={() => setCustomGoals(prev => ({
                  ...prev,
                  [m.userId]: (prev[m.userId] ?? 0) + 1,
                }))}
              >
                <MaterialIcons name="add" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* 합계 표시 (개별 설정) */}
        {splitMode === 'custom' && (
          <View style={[styles.equalInfo, !customValid && styles.equalInfoError]}>
            <MaterialIcons
              name={customValid ? 'check-circle' : 'warning'}
              size={14}
              color={customValid ? '#4CAF50' : '#E53935'}
            />
            <Text style={[styles.equalInfoText, !customValid && styles.equalInfoTextError]}>
              합계: {customTotal} / {effectiveTotal}절 {customValid ? '✓' : '— 총 목표와 달라요'}
            </Text>
          </View>
        )}

        {/* 저장/취소 버튼 */}
        <View style={styles.goalActionRow}>
          {hasGoal && (
            <TouchableOpacity
              style={styles.goalCancelBtn}
              onPress={() => setEditing(false)}
            >
              <Text style={styles.goalCancelBtnText}>취소</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.goalSaveBtn,
              (saving || (splitMode === 'custom' && !customValid)) && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={saving || (splitMode === 'custom' && !customValid)}
          >
            {saving
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={styles.goalSaveBtnText}>저장하기</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState<'independent' | 'shared'>('independent');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('', '모임 이름을 입력해주세요.'); return; }
    setLoading(true);
    try {
      const groupId = await createGroup(name.trim(), undefined, groupType);
      setName('');
      setGroupType('independent');
      onCreated(groupId);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>모임 만들기</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody}>
            <Text style={styles.inputLabel}>모임 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 우리 가족 성경쓰기"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
            />

            <Text style={[styles.inputLabel, { marginTop: 8 }]}>어떤 모임인가요?</Text>
            <View style={styles.typeSelectRow}>
              {([
                { value: 'independent', icon: '📖', title: '각자 목표형', desc: '각자 목표대로 쓰면서 서로 독려해요' },
                { value: 'shared', icon: '🤝', title: '함께 완성형', desc: '모임이 함께 성경 전체를 나눠서 완성해요' },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeCard, groupType === opt.value && styles.typeCardActive]}
                  onPress={() => setGroupType(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.typeCardIcon}>{opt.icon}</Text>
                  <Text style={[styles.typeCardTitle, groupType === opt.value && styles.typeCardTitleActive]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.typeCardDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalDesc}>
              모임이 만들어지면 초대 코드와 링크로{'\n'}최대 8명까지 초대할 수 있어요.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <><MaterialIcons name="add" size={18} color="white" /><Text style={styles.primaryBtnText}>만들기</Text></>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
function JoinGroupModal({ visible, onClose, onJoined }: {
  visible: boolean;
  onClose: () => void;
  onJoined: (groupId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.trim().length !== 6) { Alert.alert('', '6자리 코드를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const group = await joinByCode(code);
      setCode('');
      onJoined(group.id);
    } catch (e: any) {
      Alert.alert('참여 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>코드로 참여</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>6자리 초대 코드</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="A B C 1 2 3"
              placeholderTextColor={Colors.textTertiary}
              value={code}
              onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
            <Text style={styles.modalDesc}>
              모임 리더에게 초대 코드를 받아 입력하세요.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <><MaterialIcons name="login" size={18} color="white" /><Text style={styles.primaryBtnText}>참여하기</Text></>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  groupTabs: {
    flexGrow: 0, flexShrink: 0,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    minHeight: 52,
  },
  groupTabsContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 6, paddingBottom: 0, gap: 4, minHeight: 52,
  },
  groupTab: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  groupTabActive: { borderBottomColor: Colors.brand },
  groupTabText: { fontSize: 14, fontFamily: 'Pretendard-Medium', color: Colors.textTertiary },
  groupTabTextActive: { color: Colors.brand, fontFamily: 'Pretendard-Bold' },

  emptyTitle: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary, marginTop: 12 },
  emptyDesc: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.brand, borderRadius: 14, height: 52, paddingHorizontal: 28, marginTop: 8,
  },
  primaryBtnText: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: 'white' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.brand, borderRadius: 14, height: 52, paddingHorizontal: 28,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: Colors.brand },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  groupName: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  sharedBadge: {
    backgroundColor: Colors.brandLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sharedBadgeText: { fontSize: 11, fontFamily: 'Pretendard-SemiBold', color: Colors.brandGold },
  groupCode: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 16 },

  todayProgress: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  todayProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  todayProgressLabel: { fontSize: 12, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  todayProgressCount: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  todayProgressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  todayProgressFill: { height: '100%', backgroundColor: Colors.brand, borderRadius: 4 },

  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: Colors.textTertiary, letterSpacing: 0.8, marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.brand },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: 'white' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  memberName: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  memberVersesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberAssigned: { fontSize: 11, fontFamily: 'Pretendard-SemiBold', color: Colors.brand },
  memberVerses: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary },
  memberTodayVerses: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: Colors.brand },
  memberCumulative: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, marginTop: 3 },
  barBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.brand, borderRadius: 3 },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cheerBtn: { padding: 6 },
  kickBtn: { padding: 6 },

  // 모임 목표 카드 (멤버 뷰)
  goalEmptyCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 24,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  goalEmptyText: { fontSize: 14, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  goalEmptyDesc: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, textAlign: 'center' },
  memberGoalCard: {
    backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  memberGoalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  memberGoalHighlight: { backgroundColor: Colors.brandLight },
  memberGoalKey: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: Colors.textSecondary },
  memberGoalVal: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  memberGoalKeyBold: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  memberGoalValBold: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: Colors.brand },

  // 편집 폼
  goalCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
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
  stepValueSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
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
  splitSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 2 },
  splitLabel: { fontSize: 12, fontFamily: 'Pretendard-SemiBold', color: Colors.textTertiary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  equalInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.brandLight, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  equalInfoError: { backgroundColor: '#FFF3F3' },
  equalInfoText: { fontSize: 13, color: Colors.brandGold, fontFamily: 'Pretendard-SemiBold' },
  equalInfoTextError: { color: '#E53935' },
  customMemberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  customMemberName: { flex: 1, fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  customStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtnSm: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  customStepVal: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary, minWidth: 40, textAlign: 'center' },
  goalActionRow: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  goalCancelBtn: {
    flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  goalCancelBtnText: { fontSize: 14, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  goalSaveBtn: {
    flex: 2, height: 46, borderRadius: 12,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  goalSaveBtnText: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: 'white' },

  // 날짜 모달
  dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24,
  },
  dateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateModalTitle: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  dateModalCancel: { fontSize: 15, color: Colors.textSecondary, fontFamily: 'Pretendard-Regular' },
  dateModalConfirm: { fontSize: 15, color: Colors.brand, fontFamily: 'Pretendard-Bold' },

  // 모임 생성 - 유형 선택
  typeSelectRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.bg, alignItems: 'center', gap: 6,
  },
  typeCardActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  typeCardIcon: { fontSize: 24 },
  typeCardTitle: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: Colors.textSecondary, textAlign: 'center' },
  typeCardTitleActive: { color: Colors.brand },
  typeCardDesc: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, textAlign: 'center', lineHeight: 16 },

  // 피드
  feedItem: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, padding: 14, marginBottom: 10,
  },
  feedTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  avatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarSmText: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: 'white' },
  feedText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 19, fontFamily: 'Pretendard-Regular' },
  feedUser: { fontFamily: 'Pretendard-Bold' },
  feedTime: { fontSize: 11, color: Colors.textTertiary, flexShrink: 0 },
  feedActions: { flexDirection: 'row', gap: 12 },
  feedAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedActionText: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Pretendard-Regular' },

  // 하단 바
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 12, gap: 12,
  },
  newGroupBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.brand,
  },
  newGroupBtnText: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.brand },

  // 모달
  modalContainer: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  modalBody: { padding: 24, gap: 12 },
  modalDesc: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, lineHeight: 20 },
  inputLabel: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  input: {
    height: 52, backgroundColor: Colors.bg, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 15, fontFamily: 'Pretendard-Regular', color: Colors.textPrimary,
  },
  codeInput: { textAlign: 'center', fontSize: 24, fontFamily: 'Pretendard-Bold', letterSpacing: 6 },
});
