import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '@/components/Button';
import { OpponentCard } from '@/components/OpponentCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { opponentRotation } from '@/domain/opponentGenerator';
import { getTimeControl } from '@/domain/timeControls';
import { useProfileStore } from '@/store/profileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMatchStore } from '@/store/matchStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { OpponentProfile, PieceColor } from '@/types';

const MIN_SEARCH_MS = 1500;
const MAX_SEARCH_MS = 4000;

function randomPlayerColor(): PieceColor {
  return Math.random() < 0.5 ? 'w' : 'b';
}

export default function MatchmakingScreen() {
  const { t } = useTranslation();
  const playerElo = useProfileStore((s) => s.profile.elo);
  const defaultTimeControl = useSettingsStore((s) => s.settings.defaultTimeControl);
  const startMatch = useMatchStore((s) => s.startMatch);

  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [isRematchEncounter, setIsRematchEncounter] = useState(false);
  const cancelledRef = useRef(false);

  const pulse = useSharedValue(0.9);
  const rotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(0.9, { duration: 700 })), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [pulse, rotation]);

  useEffect(() => {
    cancelledRef.current = false;
    const delay = MIN_SEARCH_MS + Math.random() * (MAX_SEARCH_MS - MIN_SEARCH_MS);
    const timer = setTimeout(() => {
      if (cancelledRef.current) return;
      const { opponent: nextOpponent, isRematch } = opponentRotation.next(playerElo);
      setIsRematchEncounter(isRematch);
      setOpponent(nextOpponent);
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }), [pulse]);
  const rotationStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }), [rotation]);

  const handleCancel = () => {
    cancelledRef.current = true;
    router.back();
  };

  const handleStart = () => {
    if (!opponent) return;
    startMatch(opponent, getTimeControl(defaultTimeControl), randomPlayerColor());
    router.replace('/game');
  };

  return (
    <ScreenBackground style={styles.container}>
      {!opponent ? (
        <View style={styles.searchingWrap}>
          <Animated.View style={rotationStyle}>
            <Svg width={220} height={220} viewBox="0 0 220 220">
              <Circle cx="110" cy="110" r="95" stroke={palette.violet} strokeWidth={2} strokeDasharray="6 14" fill="none" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.pulseGlyphWrap, pulseStyle]}>
            <Text style={styles.pulseGlyph}>🔮</Text>
          </Animated.View>
          <Text style={styles.searchingText}>{t('matchmaking.searching')}</Text>
          <Text style={styles.searchingSubtext}>{t('matchmaking.analyzing')}</Text>
          <Button label={t('matchmaking.cancel')} variant="ghost" onPress={handleCancel} style={styles.cancelButton} />
        </View>
      ) : (
        <View style={styles.foundWrap}>
          <Text style={styles.foundTitle}>{t('matchmaking.found')}</Text>
          {isRematchEncounter && <Text style={styles.rematchNote}>{t('matchmaking.rematch')}</Text>}
          <OpponentCard opponent={opponent} />
          <View style={styles.eloCompareRow}>
            <View style={styles.eloCompareBox}>
              <Text style={styles.eloCompareLabel}>{t('matchmaking.yourElo')}</Text>
              <Text style={styles.eloCompareValue}>{playerElo}</Text>
            </View>
            <Text style={styles.eloCompareVs}>VS</Text>
            <View style={styles.eloCompareBox}>
              <Text style={styles.eloCompareLabel}>{t('matchmaking.opponentElo')}</Text>
              <Text style={styles.eloCompareValue}>{opponent.elo}</Text>
            </View>
          </View>
          <Button label={t('matchmaking.startMatch')} onPress={handleStart} style={styles.startButton} />
          <Button label={t('common.cancel')} variant="ghost" onPress={handleCancel} />
        </View>
      )}
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
  },
  cancelButton: {
    marginTop: spacing.lg,
  },
  foundWrap: {
    width: '100%',
    gap: spacing.md,
  },
  foundTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    color: palette.goldBright,
    textAlign: 'center',
  },
  rematchNote: {
    color: palette.arcaneBlueBright,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
  eloCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  eloCompareBox: {
    alignItems: 'center',
  },
  eloCompareLabel: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
  },
  eloCompareValue: {
    color: palette.ivory,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  eloCompareVs: {
    color: palette.violetBright,
    fontWeight: '700',
  },
  startButton: {
    marginTop: spacing.sm,
  },
});
