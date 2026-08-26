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
          <Text style={styles.updated}>Dernière mise à jour : 25 août 2026</Text>

          <Text style={styles.heading}>{t('legal.aiTitle')}</Text>
          <Text style={styles.paragraph}>
            Wizard Chest est un jeu entièrement solo. Tous les « adversaires » que vous rencontrez en matchmaking,
            ainsi que l’intégralité du classement (« Ligue solo »), sont générés et joués par une intelligence
            artificielle locale exécutée directement sur votre appareil. Il n’existe aucun mode multijoueur réel,
            aucun autre joueur humain, aucun serveur de jeu en ligne. Les pseudonymes, avatars, pays, statistiques et
            temps de recherche affichés sont simulés pour donner une sensation de compétition, mais ne correspondent
            à aucune personne réelle.
          </Text>

          <Text style={styles.heading}>Données collectées</Text>
          <Text style={styles.paragraph}>
            Wizard Chest ne collecte, ne transmet et ne stocke aucune donnée personnelle sur un serveur distant.
            L’application fonctionne entièrement hors ligne. Les seules informations enregistrées — votre pseudonyme
            choisi, votre progression (Elo, division, XP), votre historique de parties et vos préférences — sont
            stockées uniquement en local sur votre appareil (stockage applicatif privé) et ne sont jamais envoyées à
            Wizard Chest, à ses développeurs, ni à un tiers.
          </Text>

          <Text style={styles.heading}>Aucun compte requis</Text>
          <Text style={styles.paragraph}>
            Aucune création de compte, aucune adresse e-mail, aucun numéro de téléphone n’est demandé pour jouer.
            Le pseudonyme que vous choisissez est libre et ne doit pas contenir d’informations personnelles
            identifiables.
          </Text>

          <Text style={styles.heading}>Permissions de l’appareil</Text>
          <Text style={styles.paragraph}>
            L’application ne demande aucune permission sensible (pas d’accès à la caméra, aux contacts, à la
            localisation ou au microphone). Les vibrations et les sons utilisent uniquement les capacités standard
            de lecture audio et de retour haptique de votre appareil.
          </Text>

          <Text style={styles.heading}>Suppression des données</Text>
          <Text style={styles.paragraph}>
            Vous pouvez supprimer intégralement vos données locales à tout moment depuis Paramètres →
            Réinitialiser la progression, ou en désinstallant l’application.
          </Text>

          <Text style={styles.heading}>Achats intégrés</Text>
          <Text style={styles.paragraph}>
            Cette version de Wizard Chest ne propose aucun achat intégré ni publicité. L’architecture du jeu est
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
