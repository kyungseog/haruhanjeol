import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, RefreshControl,
  Modal, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, useGroupDetail } from '@/hooks/useGroup';
import { Group, createGroup, joinByCode, createInviteLink, sendReaction, deleteGroup, kickMember } from '@/lib/groupApi';
import { getBookById } from '@/constants/bible';
import { notifyReaction } from '@/lib/notificationService';

// ── 피드 항목 시간 포맷 ──────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ── 아바타 색상 ──────────────────────────────────────────────
const AVATAR_COLORS = ['#F5A623','#4CAF50','#2196F3','#9C27B0','#E91E63','#FF5722','#00BCD4','#8BC34A'];
function avatarColor(userId: string) {
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── 이니셜 ───────────────────────────────────────────────────
function initial(nickname: string | null) {
  return (nickname ?? '?').charAt(0);
}

// ────────────────────────────────────────────────────────────
export default function GroupScreen() {
  const { user } = useAuth();
  const { groups, loading: groupsLoading, reload: reloadGroups } = useMyGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null;
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;
  const { members, feed, loading: detailLoading, reload: reloadDetail } = useGroupDetail(activeGroupId);

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

      {/* 상단 모임 탭 (여러 모임 있을 때) */}
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
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 모임 없을 때 */}
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
          loading={detailLoading}
          currentUserId={user?.id ?? ''}
          currentUserNickname={user?.user_metadata?.nickname ?? user?.email?.split('@')[0] ?? '익명'}
          isCreator={activeGroup.created_by === user?.id}
          onReload={reloadDetail}
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

      {/* 새 모임 만들기 버튼 (하단) */}
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

      {/* 모임 만들기 모달 */}
      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async (groupId) => {
          setShowCreate(false);
          await reloadGroups();
          setSelectedGroupId(groupId);
        }}
      />

      {/* 코드로 참여 모달 */}
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

// ────────────────────────────────────────────────────────────
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
  group, members, feed, loading, currentUserId, currentUserNickname, isCreator,
  onReload, onGroupDeleted, onJoin, onInvite,
}: {
  group: Group;
  members: any[];
  feed: any[];
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
      if (Platform.OS === 'web') window.alert('응원을 보냈어요! 👍');
      else Alert.alert('', '응원을 보냈어요! 👍');
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('오류: ' + e.message);
      else Alert.alert('오류', e.message);
    }
  };

  const confirm = (message: string, onConfirm: () => Promise<void>) => {
    if (Platform.OS === 'web') {
      // 웹: window.confirm 직접 사용 (Alert 버튼 콜백이 웹에서 미동작)
      if (window.confirm(message)) onConfirm().catch(e => window.alert('오류: ' + e.message));
    } else {
      Alert.alert('확인', message, [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: onConfirm },
      ]);
    }
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

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onReload} tintColor={Colors.brand} />
      }
    >
      {/* 헤더 */}
      <View style={styles.groupHeader}>
        <View>
          <Text style={styles.groupName}>{group.name}</Text>
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
          {/* 멤버 진척도 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>멤버 진척도</Text>
            {members.length === 0 ? (
              <Text style={styles.emptyDesc}>아직 멤버가 없습니다.</Text>
            ) : members.map(m => (
              <View key={m.user_id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: avatarColor(m.user_id) }]}>
                  <Text style={styles.avatarText}>{initial(m.nickname)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {m.nickname ?? '익명'}{m.user_id === currentUserId ? ' (나)' : ''}
                    </Text>
                    <Text style={styles.memberVerses}>{m.completed_verses.toLocaleString()}절</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.min(m.progress_pct, 100)}%` as any }]} />
                  </View>
                </View>
                <View style={styles.memberActions}>
                  {/* 응원 버튼 (본인 제외) */}
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
                  {/* 내보내기 버튼 (생성자만, 본인 제외) */}
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
            ))}
          </View>

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

// ────────────────────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('', '모임 이름을 입력해주세요.'); return; }
    setLoading(true);
    try {
      const groupId = await createGroup(name.trim());
      setName('');
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
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>모임 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 우리 가족 성경쓰기"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
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
          </View>
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
              keyboardType="default"
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

  // 모임 탭
  groupTabs: {
    flexGrow: 0, flexShrink: 0,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    minHeight: 52,
  },
  groupTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 0,
    gap: 4,
    minHeight: 52,
  },
  groupTab: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  groupTabActive: { borderBottomColor: Colors.brand },
  groupTabText: { fontSize: 14, fontFamily: 'Pretendard-Medium', color: Colors.textTertiary },
  groupTabTextActive: { color: Colors.brand, fontFamily: 'Pretendard-Bold' },

  // 빈 상태
  emptyTitle: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary, marginTop: 12 },
  emptyDesc: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },

  // 버튼
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

  // 그룹 헤더
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  groupName: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },
  groupCode: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 16 },

  // 섹션
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: Colors.textTertiary, letterSpacing: 0.8, marginBottom: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },

  // 멤버 행
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: 'white' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  memberName: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  memberVerses: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary },
  barBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.brand, borderRadius: 3 },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cheerBtn: { padding: 6 },
  kickBtn: { padding: 6 },

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
