import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/theme/colors';
import { minTouchTarget, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('legal.privacyTitle')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.updated}>Dernière mise à jour : 30 août 2026</Text>

          <Text style={styles.heading}>{t('legal.aiTitle')}</Text>
          <Text style={styles.paragraph}>
            Le mode « Jouer » classique et la Ligue solo restent entièrement solo : ces « adversaires », ainsi que
            l’intégralité du classement associé, sont générés et joués par une intelligence artificielle locale
            exécutée directement sur votre appareil — pseudonymes, avatars, pays et statistiques y sont simulés et ne
            correspondent à aucune personne réelle. Le mode « Duel en ligne » est différent : il vous met en relation
            avec un vrai autre joueur humain, via un serveur en ligne (voir ci-dessous).
          </Text>

          <Text style={styles.heading}>Données collectées</Text>
          <Text style={styles.paragraph}>
            Un compte (identifiant + mot de passe) est nécessaire pour jouer, y compris en solo — il est créé et géré
            par notre fournisseur d’hébergement (Supabase), qui stocke votre identifiant et votre mot de passe (sous
            forme chiffrée) sur ses serveurs. Le mode « Duel en ligne » et le système d’amis transmettent également
            à ce même serveur les pseudonymes des joueurs, les demandes/liste d’amis, ainsi que l’état des parties en
            ligne en cours (position, coups, sorts) le temps qu’elles se déroulent. Votre progression (Elo, division,
            XP), votre historique de parties solo, votre photo de profil et vos préférences restent, elles, stockées
            uniquement en local sur votre appareil.
          </Text>

          <Text style={styles.heading}>Compte</Text>
          <Text style={styles.paragraph}>
            L’identifiant que vous choisissez sert aussi de pseudonyme affiché aux autres joueurs (amis, adversaires
            en duel en ligne) — ne l’utilisez pas s'il contient des informations personnelles identifiables. Le jeu
            étant en développement, n’utilisez jamais un mot de passe que vous employez ailleurs.
          </Text>

          <Text style={styles.heading}>Permissions de l’appareil</Text>
          <Text style={styles.paragraph}>
            L’application ne demande aucune permission sensible (pas d’accès à la caméra, aux contacts, à la
            localisation ou au microphone). Les vibrations et les sons utilisent uniquement les capacités standard
            de lecture audio et de retour haptique de votre appareil.
          </Text>

          <Text style={styles.heading}>Suppression des données</Text>
          <Text style={styles.paragraph}>
            Vous pouvez supprimer vos données locales à tout moment depuis Paramètres → Réinitialiser la progression,
            ou en désinstallant l’application. Pour la suppression de votre compte (identifiant, mot de passe, amis)
            côté serveur, contactez l’éditeur (voir « Contact » ci-dessous).
          </Text>

          <Text style={styles.heading}>Achats intégrés</Text>
          <Text style={styles.paragraph}>
            Cette version de Wizard Chess ne propose aucun achat intégré ni publicité. L’architecture du jeu est
            préparée pour en accueillir dans une future mise à jour, mais aucun système payant n’est actif
            actuellement.
          </Text>

          <Text style={styles.heading}>Contact</Text>
          <Text style={styles.paragraph}>
            Pour toute question relative à cette politique de confidentialité, contactez l’éditeur via la fiche de
            l’application sur l’App Store ou le Google Play Store.
          </Text>
        </ScrollView>
      </SafeAreaView>
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
    fontSize: fontSize.lg,
    color: palette.ivory,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  updated: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  heading: {
    color: palette.goldBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  paragraph: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
});
