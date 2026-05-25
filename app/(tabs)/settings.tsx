import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [defaultLang, setDefaultLang] = useState<'ko' | 'en'>('ko');
  const [notifyGroup, setNotifyGroup] = useState(true);
  const [notifyCheer, setNotifyCheer] = useState(true);

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

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
          <Text style={styles.rowLabel}>한글 (개역개정)</Text>
          <TouchableOpacity onPress={() => setDefaultLang('ko')}>
            <Text style={styles.radioIcon}>{defaultLang === 'ko' ? '🔵' : '⚪️'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>English (NIV)</Text>
          <TouchableOpacity onPress={() => setDefaultLang('en')}>
            <Text style={styles.radioIcon}>{defaultLang === 'en' ? '🔵' : '⚪️'}</Text>
          </TouchableOpacity>
        </View>

        {/* 알림 */}
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
            <Text style={styles.progressPct}>0.8%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: '0.8%' }]} />
          </View>
          <Text style={styles.progressSub}>247절 완료</Text>
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
  profileAvatarText: { fontSize: 22 }, // 사용 안 함, 아이콘으로 대체
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
  radioIcon: { fontSize: 18 },
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
