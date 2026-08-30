import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '@/components/Button';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useProfileStore } from '@/store/profileStore';
import { useOnlineMatchStore } from '@/store/onlineMatchStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function OnlineMatchmakingScreen() {
  const { t } = useTranslation();
  const playerElo = useProfileStore((s) => s.profile.elo);
  const error = useOnlineMatchStore((s) => s.error);
  const startSearch = useOnlineMatchStore((s) => s.startSearch);
  const cancelSearch = useOnlineMatchStore((s) => s.cancelSearch);

  const pulse = useSharedValue(0.9);
  const rotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(0.9, { duration: 700 })), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [pulse, rotation]);

  useEffect(() => {
    startSearch(playerElo, (matchId) => {
      router.replace({ pathname: '/online-game', params: { matchId } });
    });
    return () => void cancelSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }), [pulse]);
  const rotationStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }), [rotation]);

  const handleCancel = () => {
    void cancelSearch();
    router.back();
  };

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.searchingWrap}>
        <Animated.View style={rotationStyle}>
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Circle cx="110" cy="110" r="95" stroke={palette.violet} strokeWidth={2} strokeDasharray="6 14" fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.pulseGlyphWrap, pulseStyle]}>
          <Text style={styles.pulseGlyph}>🌐</Text>
        </Animated.View>
        <Text style={styles.searchingText}>{t('onlineMatchmaking.searching')}</Text>
        <Text style={styles.searchingSubtext}>{t('onlineMatchmaking.subtitle')}</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Button label={t('matchmaking.cancel')} variant="ghost" onPress={handleCancel} style={styles.cancelButton} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  searchingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pulseGlyphWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGlyph: {
    fontSize: 56,
  },
  searchingText: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
    marginTop: spacing.lg,
  },
  searchingSubtext: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  errorText: {
    color: palette.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: spacing.lg,
  },
});
