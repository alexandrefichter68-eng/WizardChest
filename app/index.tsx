import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useHistoryStore } from '@/store/historyStore';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

const MIN_DISPLAY_MS = 1100;

export default function LaunchScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const profileHydrated = useProfileStore((s) => s.hasHydrated);
  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const historyHydrated = useHistoryStore((s) => s.hasHydrated);
  const leaderboardHydrated = useLeaderboardStore((s) => s.hasHydrated);
  const rewardsHydrated = useRewardsStore((s) => s.hasHydrated);
  const ensureLeaderboardInitialized = useLeaderboardStore((s) => s.ensureInitialized);
  const refreshLeaderboardIfNeeded = useLeaderboardStore((s) => s.refreshIfNeeded);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const ringRotation = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });
    ringRotation.value = withRepeat(withSequence(withTiming(360, { duration: 2400, easing: Easing.linear })), -1, false);
  }, [logoOpacity, logoScale, ringRotation]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }), [logoOpacity, logoScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }), [ringRotation]);

  const allHydrated = profileHydrated && settingsHydrated && historyHydrated && leaderboardHydrated && rewardsHydrated;

  useEffect(() => {
    if (!allHydrated) return;
    ensureLeaderboardInitialized(profile.elo);
    refreshLeaderboardIfNeeded();

    const timer = setTimeout(() => {
      router.replace('/home');
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
    // Only re-run once hydration completes; profile.elo used solely to seed the pool once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHydrated]);

  return (
    <ScreenBackground style={styles.center}>
      <View style={styles.ringWrap}>
        <Animated.View style={ringStyle}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            <Circle cx="90" cy="90" r="82" stroke={palette.violet} strokeWidth={1.5} strokeDasharray="4 10" fill="none" />
            <Circle cx="90" cy="90" r="68" stroke={palette.gold} strokeWidth={1} strokeDasharray="2 8" fill="none" opacity={0.7} />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Text style={styles.logoGlyph}>♞</Text>
        </Animated.View>
      </View>
      <Animated.View style={logoStyle}>
        <Text style={styles.title}>{t('common.appName')}</Text>
        <Text style={styles.tagline}>{t('launch.tagline')}</Text>
      </Animated.View>
      <Text style={styles.loadingText}>{t('launch.preparingBoard')}</Text>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  logoWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    fontSize: 72,
    color: palette.goldBright,
    textShadowColor: palette.violet,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero,
    color: palette.ivory,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: fontSize.md,
    color: palette.ivoryMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  loadingText: {
    position: 'absolute',
    bottom: spacing.xxl,
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
});
