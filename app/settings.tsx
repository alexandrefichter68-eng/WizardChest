import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setMusicVolume } from '@/audio/sounds';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { VolumeControl } from '@/components/VolumeControl';
import { TIME_CONTROL_LABELS } from '@/domain/timeControls';
import { useAuthStore } from '@/store/authStore';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { AnimationQuality, AppLanguage, BoardOrientation, TimeControlPreset } from '@/types';

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const ANIMATION_QUALITIES: { value: AnimationQuality; labelKey: string }[] = [
  { value: 'low', labelKey: 'settings.animationLow' },
  { value: 'medium', labelKey: 'settings.animationMedium' },
  { value: 'high', labelKey: 'settings.animationHigh' },
];

const ORIENTATIONS: { value: BoardOrientation; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.orientationAuto' },
  { value: 'white', labelKey: 'settings.orientationWhite' },
  { value: 'black', labelKey: 'settings.orientationBlack' },
];

const TIME_CONTROLS: TimeControlPreset[] = ['blitz3', 'rapid5', 'rapid10', 'classical15'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const resetRewards = useRewardsStore((s) => s.resetRewards);
  const signOut = useAuthStore((s) => s.signOut);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleResetProgress = () => {
    Alert.alert(t('settings.resetProgressConfirmTitle'), t('settings.resetProgressConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetProgress'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('settings.resetProgressConfirmTitle'), t('settings.resetProgressFinalConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.confirm'),
              style: 'destructive',
              onPress: () => {
                resetProgress();
                clearHistory();
                resetRewards();
                router.replace('/home');
              },
            },
          ]);
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SectionTitle label={t('settings.language')} />
          <Card style={styles.card}>
            <ChoiceRow
              options={LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
              value={settings.language}
              onChange={(value) => updateSettings({ language: value as AppLanguage })}
            />
          </Card>

          <SectionTitle label={t('settings.audio')} />
          <Card style={styles.card}>
            <ToggleRow label={t('settings.music')} value={settings.musicEnabled} onChange={(v) => updateSettings({ musicEnabled: v })} />
            {settings.musicEnabled && (
              <View style={{ marginTop: spacing.xs }}>
                <VolumeControl
                  label={t('settings.musicVolume')}
                  value={settings.musicVolume}
                  onChange={(v) => {
                    updateSettings({ musicVolume: v });
                    setMusicVolume(v);
                  }}
                />
              </View>
            )}
            <ToggleRow label={t('settings.sfx')} value={settings.sfxEnabled} onChange={(v) => updateSettings({ sfxEnabled: v })} />
            <ToggleRow label={t('settings.haptics')} value={settings.hapticsEnabled} onChange={(v) => updateSettings({ hapticsEnabled: v })} last />
          </Card>

          <SectionTitle label={t('settings.display')} />
          <Card style={styles.card}>
            <Text style={styles.rowLabel}>{t('settings.animationQuality')}</Text>
            <ChoiceRow
              options={ANIMATION_QUALITIES.map((a) => ({ value: a.value, label: t(a.labelKey) }))}
              value={settings.animationQuality}
              onChange={(value) => updateSettings({ animationQuality: value as AnimationQuality })}
            />
            <Text style={[styles.rowLabel, { marginTop: spacing.sm }]}>{t('settings.boardOrientation')}</Text>
            <ChoiceRow
              options={ORIENTATIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              value={settings.boardOrientation}
              onChange={(value) => updateSettings({ boardOrientation: value as BoardOrientation })}
            />
          </Card>

          <SectionTitle label={t('settings.gameplay')} />
          <Card style={styles.card}>
            <ToggleRow label={t('settings.confirmResign')} value={settings.confirmBeforeResign} onChange={(v) => updateSettings({ confirmBeforeResign: v })} />
            <Text style={[styles.rowLabel, { marginTop: spacing.sm }]}>{t('settings.defaultTimeControl')}</Text>
            <ChoiceRow
              options={TIME_CONTROLS.map((preset) => ({ value: preset, label: TIME_CONTROL_LABELS[preset] }))}
              value={settings.defaultTimeControl}
              onChange={(value) => updateSettings({ defaultTimeControl: value as TimeControlPreset })}
            />
          </Card>

          <SectionTitle label={t('settings.account')} />
          <Card style={styles.card}>
            <Button label={t('settings.signOut')} variant="secondary" onPress={() => void handleSignOut()} />
          </Card>

          <SectionTitle label={t('settings.about')} />
          <Card style={styles.card}>
            <Text style={styles.aiDisclaimer}>{t('settings.aiDisclaimer')}</Text>
            <Pressable onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
              <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
            </Pressable>
            <Text style={styles.versionText}>{t('settings.version', { version: appVersion })}</Text>
          </Card>

          <SectionTitle label={t('settings.dangerZone')} />
          <Card style={styles.card}>
            <Button label={t('settings.resetProgress')} variant="danger" onPress={handleResetProgress} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ToggleRow({ label, value, onChange, last }: { label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleRowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: palette.stoneBorder, true: palette.violet }} thumbColor={palette.ivory} />
    </View>
  );
}

function ChoiceRow<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
          >
            <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.voidBlack,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: palette.ivory,
  },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: palette.violetBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.stoneBorder,
  },
  rowLabel: {
    color: palette.ivory,
    fontSize: fontSize.md,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  choiceChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  choiceChipActive: {
    backgroundColor: palette.violet,
    borderColor: palette.violetBright,
  },
  choiceChipText: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: palette.ivory,
  },
  aiDisclaimer: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.md * 1.4,
  },
  linkText: {
    color: palette.arcaneBlueBright,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  versionText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
});
