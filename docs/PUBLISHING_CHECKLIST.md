# Checklist de publication — Wizard Chest

## 0. Comptes et accès à créer (par toi, pas par Claude)

- [ ] Un compte **Expo/EAS** (gratuit) sur https://expo.dev
- [ ] Un compte **Apple Developer Program** (99 $/an) sur https://developer.apple.com
- [ ] Un compte **Google Play Console** (25 $ à vie) sur https://play.google.com/console
- [ ] (Optionnel mais recommandé) Un nom de domaine ou une page web publique pour héberger
      `PRIVACY_POLICY.md` (App Store et Play Store exigent une URL publique, pas juste un
      fichier local)

## 1. Identifiants de l'application

- Identifiant Android (package name) : `com.wizardchest.game`
- Identifiant iOS (bundle identifier) : `com.wizardchest.game`

⚠️ **À vérifier avant de publier** : ces identifiants doivent être **uniques au monde** sur
chaque store. Si `com.wizardchest.game` est déjà pris par une autre application (peu probable
mais possible), il faudra le changer dans `app.json` (`ios.bundleIdentifier` et
`android.package`) **avant le premier build de soumission** — le changer après publication casse
la mise à jour continue de l'app.

## 2. Configuration déjà en place

- [x] `app.json` : nom, slug, version (1.0.0), orientation portrait, icônes, splash screen,
      couleurs, permissions minimales (aucune permission sensible), `newArchEnabled: true`
- [x] `eas.json` : profils `development`, `preview`, `production` (Android → app-bundle,
      iOS → build standard)
- [x] Icônes et splash screen générés (voir `docs/ASSETS_TODO.md` pour la version définitive
      recommandée)
- [x] Aucune donnée personnelle collectée, aucun tracking, aucun SDK publicitaire

## 3. Étapes EAS Build (commandes exactes)

```bash
cd WizardChest

# 1. Installer l'outil EAS CLI (une fois, globalement ou via npx)
npm install -g eas-cli

# 2. Se connecter à ton compte Expo
eas login

# 3. Lier le projet à ton compte EAS (génère un vrai projectId, à copier dans app.json > extra.eas.projectId)
eas init

# 4. Build de test interne (APK Android + build iOS simulateur, rapide, pour vérifier que tout compile)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# 5. Build de production (App Bundle Android signé + build iOS pour l'App Store)
eas build --profile production --platform android
eas build --profile production --platform ios

# 6. Soumission aux stores (une fois les builds de production terminés)
eas submit --platform android
eas submit --platform ios
```

`eas build` gère la génération des dossiers natifs (`android/`, `ios/`) à la volée — inutile de
les committer, ils sont déjà dans `.gitignore`.

## 4. Avant le premier `eas submit`

### Android (Google Play)

- [ ] Créer l'application dans Google Play Console
- [ ] Remplir la fiche store (voir `docs/STORE_LISTING.md`)
- [ ] Renseigner l'URL de la politique de confidentialité (hébergée publiquement)
- [ ] Répondre au questionnaire de classification de contenu
- [ ] Répondre au questionnaire « Sécurité des données » (Data Safety) : **aucune donnée
      collectée** (cocher "No data collected")
- [ ] Uploader au moins 2 captures d'écran téléphone (format 16:9 ou 9:16) — voir la liste dans
      `docs/STORE_LISTING.md`
- [ ] Créer un compte de service Google Cloud pour `eas submit` automatique, ou uploader le
      `.aab` manuellement au premier envoi
- [ ] Publier d'abord en test interne/fermé avant la production

### iOS (App Store Connect)

- [ ] Créer l'App ID `com.wizardchest.game` dans le portail développeur Apple
- [ ] Créer l'application dans App Store Connect
- [ ] Remplir la fiche store (voir `docs/STORE_LISTING.md`)
- [ ] Renseigner l'URL de la politique de confidentialité
- [ ] Remplir le questionnaire de confidentialité (« App Privacy ») : **aucune donnée
      collectée**
- [ ] Uploader les captures d'écran requises (6.7" et 6.5" minimum)
- [ ] Renseigner les informations de contact pour la revue Apple
- [ ] Soumettre à TestFlight d'abord pour vérifier le build sur un vrai appareil

## 5. Checklist qualité avant soumission

- [ ] `npm run typecheck` sans erreur
- [ ] `npm run lint` sans erreur
- [ ] `npm test` — tous les tests passent
- [ ] Testé sur au moins un vrai appareil iOS et un vrai appareil Android (via `eas build
      --profile development` + Expo Dev Client, ou directement un `preview` build) — **non
      fait dans cet environnement de développement**, car aucun simulateur/appareil physique
      n'y est disponible ; à faire impérativement avant publication
- [ ] Vérifier que le son et les vibrations fonctionnent sur appareil réel (le rendu web/dev
      ne garantit pas le comportement natif final)
- [ ] Vérifier les zones de sécurité (encoche, barre de gestes) sur un appareil à écran
      découpé (iPhone avec Dynamic Island, Android avec encoche)
- [ ] Relire la fiche store et la politique de confidentialité une dernière fois
- [ ] Incrémenter `version` dans `app.json` selon les règles de chaque store avant chaque
      nouvelle soumission

## 6. Après publication

- [ ] Vérifier que le lien de la politique de confidentialité fonctionne publiquement
- [ ] Surveiller les premiers avis/retours
- [ ] Préparer le canal de mise à jour (EAS Update peut pousser des correctifs JS sans repasser
      par la revue du store, pour les changements ne touchant pas le code natif)
