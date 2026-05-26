import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/hooks/useAuth';
import { LangProvider } from '@/lib/langContext';
import { registerForPushNotifications } from '@/lib/notificationService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular':  require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium':   require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold':     require('../assets/fonts/Pretendard-Bold.otf'),
  });

  const { session, loading } = useAuth();
  const segments = useSegments();
  const splashHidden = useRef(false);

  // 로그인 후 푸시 토큰 등록
  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotifications(session.user.id);
    }
  }, [session?.user?.id]);

  // 알림 탭 → 모임 화면으로 이동
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.groupId) {
        router.push('/(tabs)/group');
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || loading) return;
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, fontsLoaded, segments]);

  if (!fontsLoaded || loading) return null;

  return (
    <LangProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bible/[bookId]" />
        <Stack.Screen name="bible/write" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join/[token]" />
      </Stack>
    </GestureHandlerRootView>
    </LangProvider>
  );
}
