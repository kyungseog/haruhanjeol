import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AppIcon } from '@/components/icons/AppIcon';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setNickname('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const switchMode = (next: Mode) => {
    reset();
    setMode(next);
  };

  const validate = (): string | null => {
    if (!email.trim()) return '이메일을 입력해주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
    if (mode === 'signup') {
      if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('입력 확인', err); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        // 로그인 성공 → _layout.tsx의 useEffect가 /(tabs)로 리다이렉트
      } else {
        await signUp(email.trim(), password, nickname.trim() || undefined);
        Alert.alert(
          '가입 완료!',
          '이메일로 인증 링크가 발송됐습니다.\n메일을 확인 후 로그인해주세요.',
          [{ text: '확인', onPress: () => switchMode('login') }],
        );
      }
    } catch (e: any) {
      const msg = e?.message ?? '오류가 발생했습니다.';
      if (msg.includes('Invalid login credentials')) {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (msg.includes('Email rate limit')) {
        Alert.alert('잠시 후 시도해주세요', '이메일 전송 한도를 초과했습니다.');
      } else if (msg.includes('already registered')) {
        Alert.alert('이미 가입된 이메일', '해당 이메일로 이미 계정이 있습니다.');
      } else {
        Alert.alert('오류', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 */}
          <View style={styles.logoArea}>
            <AppIcon size={80} variant="light" />
            <Text style={styles.appName}>하루한절</Text>
            <Text style={styles.tagline}>하루한알 비타민처럼,{'\n'}매일 한절씩 꾸준히</Text>
          </View>

          {/* 탭 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => switchMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            {/* 닉네임 (회원가입만) */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>닉네임</Text>
                <TextInput
                  style={styles.input}
                  placeholder="사용할 이름을 입력하세요"
                  placeholderTextColor={Colors.textTertiary}
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
            )}

            {/* 이메일 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* 비밀번호 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="6자 이상"
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType={mode === 'login' ? 'done' : 'next'}
                  onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={Colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 비밀번호 확인 (회원가입만) */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력하세요"
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                {confirmPassword.length > 0 && (
                  <Text style={[
                    styles.matchText,
                    { color: password === confirmPassword ? Colors.success : '#FF3B30' },
                  ]}>
                    {password === confirmPassword ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                  </Text>
                )}
              </View>
            )}

            {/* 제출 버튼 */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? '로그인' : '가입하기'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 간편 로그인 (추후 활성화) */}
          <View style={styles.socialSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.kakaoBtn} disabled activeOpacity={0.6}>
              <Text style={styles.kakaoBtnText}>🔒  카카오로 시작하기 (준비 중)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleBtn} disabled activeOpacity={0.6}>
              <Text style={styles.googleBtnText}>🔒  Google로 시작하기 (준비 중)</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF7' },
  scroll: { paddingHorizontal: 28, paddingBottom: 40 },

  logoArea: { alignItems: 'center', paddingTop: 40, marginBottom: 32 },
  appName: {
    fontSize: 30, fontFamily: 'Pretendard-Bold',
    color: Colors.textPrimary, letterSpacing: -0.5, marginTop: 12, marginBottom: 6,
  },
  tagline: {
    fontSize: 13, fontFamily: 'Pretendard-Regular',
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },

  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.border,
    borderRadius: 12, padding: 3, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { fontSize: 14, fontFamily: 'Pretendard-Medium', color: Colors.textTertiary },
  tabTextActive: { fontFamily: 'Pretendard-Bold', color: Colors.textPrimary },

  form: { gap: 16, marginBottom: 24 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: Colors.textSecondary },
  input: {
    height: 52, backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 15, fontFamily: 'Pretendard-Regular',
    color: Colors.textPrimary,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  matchText: { fontSize: 12, fontFamily: 'Pretendard-Medium', marginTop: 4 },

  submitBtn: {
    height: 54, backgroundColor: Colors.brand,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: 'white' },

  socialSection: { gap: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: Colors.textTertiary },

  kakaoBtn: {
    height: 52, backgroundColor: '#FEE500',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: 0.45,
  },
  kakaoBtnText: { fontSize: 14, fontFamily: 'Pretendard-SemiBold', color: 'rgba(0,0,0,0.6)' },
  googleBtn: {
    height: 52, backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', opacity: 0.45,
  },
  googleBtnText: { fontSize: 14, fontFamily: 'Pretendard-Medium', color: Colors.textTertiary },
});
