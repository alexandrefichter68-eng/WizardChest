import '@/i18n';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAudio, setMusicContext } from '@/audio/sounds';
import { useAuthStore } from '@/store/authStore';
import { useHistoryStore } from '@/store/historyStore';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.settings.language);
  const musicEnabled = useSettingsStore((s) => s.settings.musicEnabled);
  const musicVolume = useSettingsStore((s) => s.settings.musicVolume);

  const profileHydrated = useProfileStore((s) => s.hasHydrated);
  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const historyHydrated = useHistoryStore((s) => s.hasHydrated);
  const leaderboardHydrated = useLeaderboardStore((s) => s.hasHydrated);
  const rewardsHydrated = useRewardsStore((s) => s.hasHydrated);
  const authHydrated = useAuthStore((s) => s.hasHydrated);

  const allHydrated = profileHydrated && settingsHydrated && historyHydrated && leaderboardHydrated && rewardsHydrated && authHydrated;

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
    // The match screen drives its own "match" playlist (start track, then tavern tracks in
    // sequence for long games); every other screen loops the single menu track.
    setMusicContext(pathname === '/game' ? 'match' : 'menu', musicEnabled, musicVolume);
  }, [musicEnabled, musicVolume, pathname]);

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
