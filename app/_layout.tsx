import '@/i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAudio, setMusicEnabled } from '@/audio/sounds';
import { useHistoryStore } from '@/store/historyStore';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { i18n } = useTranslation();
  const language = useSettingsStore((s) => s.settings.language);
  const musicEnabled = useSettingsStore((s) => s.settings.musicEnabled);
  const musicTrack = useSettingsStore((s) => s.settings.musicTrack);

  const profileHydrated = useProfileStore((s) => s.hasHydrated);
  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const historyHydrated = useHistoryStore((s) => s.hasHydrated);
  const leaderboardHydrated = useLeaderboardStore((s) => s.hasHydrated);
  const rewardsHydrated = useRewardsStore((s) => s.hasHydrated);

  const allHydrated = profileHydrated && settingsHydrated && historyHydrated && leaderboardHydrated && rewardsHydrated;

  useEffect(() => {
    if (allHydrated) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [allHydrated]);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    void initAudio();
  }, []);

  useEffect(() => {
    setMusicEnabled(musicEnabled, musicTrack);
  }, [musicEnabled, musicTrack]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: palette.voidBlack },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
