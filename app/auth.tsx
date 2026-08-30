import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

type Tab = 'login' | 'signup';

export default function AuthScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const setProfilePhoto = useProfileStore((s) => s.setProfilePhoto);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);

  const [tab, setTab] = useState<Tab>('signup');
  const [login, setLogin] = useState(profile.username);
  const [password, setPassword] = useState('');
  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = login.trim().length > 0 && password.length > 0 && !submitting;

  const pickPhoto = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const dataUri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    setPhotoUri(dataUri);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    // Login and in-game display name are the same field on purpose — no separate "pseudo" input,
    // one identity for the whole account. Real Supabase account either way — no more local mockup.
    const failure = tab === 'signup' ? await signUp(login, password) : await signIn(login, password);
    setSubmitting(false);
    if (failure) {
      setError(failure);
      return;
    }
    if (tab === 'signup') setProfilePhoto(photoUri ?? null);
    router.replace('/home');
  };

  return (
    <ScreenBackground style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => { setTab('signup'); setError(null); }}
              accessibilityRole="button"
              style={[styles.tabButton, tab === 'signup' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, tab === 'signup' && styles.tabLabelActive]}>{t('auth.signupTab')}</Text>
            </Pressable>
            <Pressable
              onPress={() => { setTab('login'); setError(null); }}
              accessibilityRole="button"
              style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelActive]}>{t('auth.loginTab')}</Text>
            </Pressable>
          </View>

          <Card style={styles.formCard}>
            {tab === 'signup' && (
              <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={t('auth.changePhoto')} style={styles.photoPicker}>
                <Avatar avatar={profile.avatar} photoUri={photoUri} size={84} />
                <Text style={styles.changePhotoLabel}>{t('auth.changePhoto')}</Text>
              </Pressable>
            )}

            <Text style={styles.fieldLabel}>{t('auth.loginLabel')}</Text>
            <TextInput
              value={login}
              onChangeText={setLogin}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('auth.loginPlaceholder')}
              placeholderTextColor={palette.ivoryFaint}
              style={styles.input}
              accessibilityLabel={t('auth.loginLabel')}
            />

            <Text style={styles.fieldLabel}>{t('auth.passwordLabel')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={palette.ivoryFaint}
              style={styles.input}
              accessibilityLabel={t('auth.passwordLabel')}
            />

            <Text style={styles.warning}>{t('auth.devPasswordWarning')}</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              label={tab === 'signup' ? t('auth.signupButton') : t('auth.loginButton')}
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={submitting}
              style={styles.submitButton}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero,
    color: palette.ivory,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: palette.stonePanel,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: palette.violet,
  },
  tabLabel: {
    color: palette.ivoryMuted,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  tabLabelActive: {
    color: palette.ivory,
  },
  formCard: {
    gap: spacing.xs,
  },
  photoPicker: {
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  changePhotoLabel: {
    color: palette.violetBright,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  fieldLabel: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.ivory,
    fontSize: fontSize.md,
  },
  warning: {
    color: palette.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    color: palette.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
