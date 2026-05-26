import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { joinByToken } from '@/lib/groupApi';
import { useAuth } from '@/hooks/useAuth';

export default function JoinByTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (!token) {
      setStatus('error');
      setErrorMsg('유효하지 않은 링크입니다.');
      return;
    }

    joinByToken(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.replace('/(tabs)/group'), 1500);
      })
      .catch(e => {
        setStatus('error');
        setErrorMsg(e.message ?? '모임 참여에 실패했습니다.');
      });
  }, [token, user, authLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.msg}>모임에 참여 중...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <MaterialIcons name="check-circle" size={64} color={Colors.brand} />
            <Text style={styles.msg}>모임에 참여했어요!</Text>
            <Text style={styles.sub}>잠시 후 모임 화면으로 이동합니다</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
            <Text style={styles.errMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.replace('/(tabs)/group')}
            >
              <Text style={styles.btnText}>모임 화면으로</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  msg: { fontSize: 17, fontFamily: 'Pretendard-SemiBold', color: Colors.textPrimary },
  sub: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary },
  errMsg: {
    fontSize: 15, fontFamily: 'Pretendard-Regular',
    color: '#FF3B30', textAlign: 'center', lineHeight: 22,
  },
  btn: {
    backgroundColor: Colors.brand, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  btnText: { fontSize: 15, fontFamily: 'Pretendard-Bold', color: 'white' },
});
