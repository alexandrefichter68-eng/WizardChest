# Wizard Chest

Jeu d'échecs mobile solo (iOS/Android) avec une sensation de compétition en ligne : matchmaking
animé, profils d'adversaires générés, classement par divisions, progression Elo — le tout
propulsé par une intelligence artificielle locale, entièrement hors ligne. Direction artistique
dark fantasy médiévale (pierre, ivoire, or, violet).

**Important, honnêteté d'abord** : Wizard Chest est un jeu strictement solo. Les « adversaires »
et le classement sont générés et joués par une IA locale — il n'y a ni serveur, ni autre joueur
humain. Cette information est visible dans l'app (Paramètres) et dans la fiche store. Voir
[`PRIVACY_POLICY.md`](PRIVACY_POLICY.md).

## Stack technique

- **React Native + Expo (SDK 57)**, TypeScript strict
- **Expo Router** (navigation par fichiers)
- **chess.js** pour les règles, la validation des coups, échecs/mats/promotions/roque/en passant
- **Moteur d'IA maison** (minimax/alpha-bêta + quiescence, en TypeScript) — voir
  [`docs/AI_ENGINE_CHOICE.md`](docs/AI_ENGINE_CHOICE.md) pour l'explication détaillée du choix
  (pas de Stockfish, et pourquoi)
- **Zustand** (+ `persist`) pour l'état global et la sauvegarde locale
- **`@react-native-async-storage/async-storage`** pour la persistance
- **`react-native-reanimated` + `react-native-gesture-handler`** pour les animations et le
  glisser-déposer des pièces
- **`react-native-svg` + `expo-linear-gradient`** pour tous les graphismes vectoriels (avatars,
  emblèmes, icône d'app) — aucune image tierce
- **`expo-audio` + `expo-haptics`** pour le son et les vibrations
- **`i18next` / `react-i18next`** pour l'internationalisation (français par défaut, anglais
  complet)
- **Jest + Testing Library** pour les tests

Aucun backend n'est requis ni utilisé. Tout fonctionne hors connexion.

## Démarrage

Prérequis : Node.js 20+ et npm.

```bash
cd WizardChest
npm install
npm start          # ouvre le menu Expo (scanner le QR code avec Expo Go, ou choisir une plateforme)
npm run android     # lance sur émulateur/appareil Android
npm run ios         # lance sur simulateur iOS (macOS uniquement)
npm run web         # lance dans le navigateur (pratique pour un aperçu rapide, non ciblé en prod)
```

## Commandes de test et de qualité

```bash
npm run typecheck   # TypeScript strict, zéro erreur
npm run lint         # ESLint (eslint-config-expo)
npm test             # Jest — 70 tests unitaires (moteur d'échecs, Elo, divisions, XP,
                      # classement, générateur d'adversaires, succès, persistance)
npm run test:watch   # Jest en mode watch
```

## Commandes de build

```bash
npm install -g eas-cli
eas login
eas init                                   # une seule fois, lie le projet à ton compte EAS
eas build --profile preview --platform android   # APK de test rapide
eas build --profile preview --platform ios       # build simulateur iOS
eas build --profile production --platform android # App Bundle (.aab) signé pour Google Play
eas build --profile production --platform ios      # build pour l'App Store
eas submit --platform android
eas submit --platform ios
```

Détails complets, comptes à créer, et checklist avant soumission :
[`docs/PUBLISHING_CHECKLIST.md`](docs/PUBLISHING_CHECKLIST.md).

## Identifiants d'application

- Android (package name) : `com.wizardchest.game`
- iOS (bundle identifier) : `com.wizardchest.game`

⚠️ À vérifier qu'ils sont disponibles sur chaque store avant la première soumission (voir la
checklist de publication).

## Architecture du projet

```
WizardChest/
  app/                    Écrans (Expo Router — un fichier = une route)
    _layout.tsx            Layout racine (i18n, hydratation des stores, splash screen)
    index.tsx               Écran de lancement
    home.tsx                 Accueil
    matchmaking.tsx           Recherche d'adversaire
    game.tsx                   Partie d'échecs
    result.tsx                 Écran de résultat
    leaderboard.tsx             Classement
    history/                    Historique (liste + détail)
    rewards.tsx                  Succès et cosmétiques
    settings.tsx                  Paramètres
    legal/privacy.tsx              Politique de confidentialité (in-app)
  src/
    engine/                 Moteur d'IA (recherche, évaluation, difficulté)
    domain/                 Logique métier pure (Elo, divisions, XP, générateur
                             d'adversaires, classement simulé, succès, cosmétiques)
    store/                  État global Zustand (profil, paramètres, historique,
                             classement, récompenses, partie en cours)
    components/             Composants UI réutilisables (échiquier, avatar, boutons...)
    storage/                Wrapper AsyncStorage
    audio/                  Lecture des effets sonores et de la musique
    hooks/                  Hooks (son, vibrations)
    i18n/                   Traductions français/anglais
    theme/                  Couleurs, typographie, espacements
    types/                  Types TypeScript partagés
  scripts/
    generate-sounds.js       Génère les effets sonores placeholder (synthèse, sans téléchargement)
    generate-icons.js         Génère l'icône d'app et le splash screen (SVG → PNG)
  assets/
    images/                  Icônes et splash générés
    sounds/                  Effets sonores et musique générés
  docs/
    AI_ENGINE_CHOICE.md       Pourquoi pas Stockfish, et ce qu'implémente le moteur maison
    ASSETS_TODO.md             Liste exacte des assets à améliorer plus tard
    STORE_LISTING.md            Textes de fiche App Store / Google Play
    PUBLISHING_CHECKLIST.md      Checklist complète de publication
```

## Fonctionnalités terminées

- Écran de lancement animé, création automatique du profil à la première ouverture
- Accueil : profil, avatar généré, pseudonyme modifiable, Elo, division, barre de progression,
  série de victoires, récompense quotidienne
- Matchmaking simulé : délai de recherche aléatoire crédible (1.5–4 s), génération d'un
  adversaire cohérent avec le niveau du joueur (pseudonyme, avatar, pays, Elo, style de jeu,
  taux de victoire), rotation évitant de réutiliser trop souvent les mêmes profils, avec une
  chance rare de retrouver un adversaire déjà rencontré
- Partie d'échecs complète : toutes les règles (roque, prise en passant, promotion, échec et
  mat, pat, répétition, règle des 50 coups, matériel insuffisant), toucher ou glisser-déposer,
  coups légaux affichés, dernier coup et échec signalés, chronomètre configurable avec
  incrément, abandon (avec confirmation configurable), proposition de nulle simulée (acceptée
  ou refusée selon l'évaluation de la position par l'IA), rotation de l'échiquier
- IA à force réglable par division (profondeur de recherche + bruit de compétence), délai de
  réflexion naturel et variable entre chaque coup
- Fin de partie : l'échiquier reste affiché dans sa position finale (aucune redirection
  automatique), avec un panneau « Voir le résultat » / « Quitter »
- **Sorts éphémères pendant la partie** : or gagné en capturant des pièces (pion +1, fou/cavalier
  +3, tour +5, dame +9) ou en mettant l'adversaire en échec (+5, hors mat) ; boutique en jeu avec
  4 sorts à usage unique — Explosion (sacrifie un pion allié, détruit toutes les pièces adjacentes
  hors rois), Téléportation (échange deux pièces alliées), Bouclier (rend une pièce alliée
  invulnérable au tour adverse suivant) et Saut (une pièce alliée ignore les blocages lors de son
  prochain déplacement, en conservant son déplacement d'origine). L'or et les sorts sont
  entièrement remis à zéro à chaque partie (non persistés). Voir
  [`docs/AI_ENGINE_CHOICE.md`](docs/AI_ENGINE_CHOICE.md) pour le détail technique de
  l'implémentation (moteur de coups dédié pour le Saut, mutation directe du plateau via
  `chess.js`) et la garantie que les sorts ne peuvent jamais produire de position illégale.
- Résultat de partie : cause précise, variation Elo, XP gagnée, promotion de division, série de
  victoires, revanche, sauvegarde PGN
- Classement simulé : ~100 profils générés, évolution progressive et bornée dans le temps
  (aucun changement absurde), le joueur y apparaît réellement, filtres Mondial / Ma division /
  Saison, mention explicite « ligue solo »
- 9 divisions (Bois → Sorcier Suprême) avec plage d'Elo, couleur, emblème, récompense de
  promotion et difficulté d'IA associée ; système Elo standard basé sur les vrais résultats
- Historique des parties : résultat, couleur jouée, adversaire, variation Elo, date, durée,
  consultation de la position finale, copie du PGN, stockage borné (300 parties max)
- Progression et récompenses : XP, niveaux, récompense quotidienne avec série, 12 succès,
  thèmes d'échiquier et de pièces cosmétiques déblocables par division
- Paramètres complets : langue (FR/EN), musique, effets sonores, vibrations, qualité des
  animations, orientation de l'échiquier, confirmation avant abandon, cadence par défaut,
  politique de confidentialité, mention IA/ligue simulée, version, réinitialisation de la
  progression avec double confirmation
- Son et retour haptique pour tous les événements de jeu (dont les 4 sorts, l'or gagné et la
  boutique), activables/désactivables séparément ; 3 pistes musicales au choix dans les
  paramètres (Taverne héroïque, Marche épique, Nuit mystique)
- Contraste des pièces garanti sur tous les thèmes : un halo de contraste (clair derrière les
  pièces noires, sombre derrière les blanches) s'ajoute automatiquement à la couleur du thème
  pour qu'aucune pièce ne se confonde jamais avec une case de la même teinte
- 88 tests unitaires couvrant le moteur d'échecs (légalité, mat, sélection de coup), le moteur de
  sorts (déplacement du Saut en ignorant les blocages, sécurité du roi, Explosion, Téléportation),
  le système Elo, les divisions, l'XP, le classement, le générateur d'adversaires, les règles de
  succès et la persistance
- Testé manuellement de bout en bout (aperçu web pendant le développement) : accueil →
  matchmaking → partie jouable (coup du joueur + réponse IA, capture, abandon avec confirmation,
  fin de partie) → boutique de sorts → tous les écrans secondaires

## Ce qui reste honnêtement à faire

- **Test sur appareils réels iOS/Android** : cet environnement de développement n'a ni
  simulateur ni appareil physique. Le typecheck, le lint, les 70 tests unitaires et un aperçu
  web manuel ont validé la logique et l'UI, mais un passage sur de vrais appareils (via `eas
  build --profile development` ou `preview`) est indispensable avant publication, en particulier
  pour le son, les vibrations, le glisser-déposer tactile et les zones de sécurité d'écran.
- **Assets visuels/audio définitifs** : tous les graphismes et sons actuels sont générés par
  code (voir [`docs/ASSETS_TODO.md`](docs/ASSETS_TODO.md)) — fonctionnels et cohérents avec la
  DA, mais une passe artistique/sound design professionnelle les rendrait plus premium.
- **Captures d'écran de fiche store** : à produire depuis un vrai build.
- **Comptes développeur Apple/Google et projet EAS** : à créer par toi (voir
  [`docs/PUBLISHING_CHECKLIST.md`](docs/PUBLISHING_CHECKLIST.md)), aucun accès à ces services
  n'existe dans cet environnement.
- **Achats intégrés** : l'architecture est prête (`unlockedBoardThemes` /
  `unlockedPieceThemes` dans le profil, système de déblocage), mais aucun système payant n'est
  implémenté ni activé, conformément au cahier des charges.
- **Flux complet des sorts non rejoué manuellement de bout en bout** (gagner de l'or via une
  vraie capture → acheter → armer → cibler) : la logique de chaque sort est validée par les 18
  tests unitaires dédiés et par une relecture attentive du code de branchement dans
  `app/game.tsx`, et la boutique/barre de sorts a été vérifiée visuellement (icônes,
  descriptions, désactivation « Or insuffisant »), mais je n'ai pas rejoué une capture réelle
  jusqu'au bout dans l'aperçu pour observer l'or apparaître puis dépenser un sort à l'écran — à
  vérifier en priorité lors du premier test sur appareil réel.

## Corrections et ajouts de cette itération

Après un premier retour utilisateur, plusieurs corrections ont été apportées et vérifiées :

- **Bug important trouvé et corrigé** : en testant le flux de jeu de bout en bout, l'effet React
  responsable de faire jouer l'IA se déclenchait parfois plus d'une fois pour une même position
  (probable double-invocation des effets en mode développement), ce qui pouvait faire jouer
  plusieurs coups d'affilée avant de rendre la main au joueur. Corrigé avec une garde
  d'idempotence basée sur un ref (`app/game.tsx`, `aiDispatchedForFenRef`) et vérifié en
  inspectant l'état réel du plateau après correction.
- Fin de partie (échec et mat, abandon, temps écoulé, nulle) : l'échiquier reste maintenant
  affiché, un panneau propose « Voir le résultat » ou « Quitter » au lieu d'une redirection
  automatique.
- Le bouton Abandonner ne fonctionnait pas de façon fiable (la confirmation utilisait l'API
  `Alert` de React Native, peu fiable sur certaines cibles, notamment le web) : remplacé par une
  modale maison (`ConfirmModal`), vérifiée à l'écran.
- Pièces noires invisibles sur les cases sombres du thème par défaut (même couleur exacte) :
  couleur corrigée et halo de contraste ajouté systématiquement.
- Délai avant qu'un coup de l'IA ne s'affiche : fenêtres raccourcies (max ~1.8s même pour les
  divisions les plus fortes) pour rester naturel sans être long.
- Délai avant le refus d'une proposition de nulle par l'IA : allongé et rendu aléatoire
  (1.2–2.5s) pour paraître plus délibéré.
- Musique d'ambiance jugée trop angoissante : remplacée par défaut par une piste « Taverne
  héroïque » enjouée, avec deux autres choix (« Marche épique », « Nuit mystique ») dans les
  paramètres.
- Ajout du système de sorts éphémères complet (voir ci-dessus).

## Note sur l'environnement de build

Node.js n'était pas installé sur cette machine ; il a été installé via `winget` (avec accord
préalable) pour pouvoir initialiser et faire tourner le projet. `npm install` peut nécessiter le
flag `--legacy-peer-deps` selon les versions ; un fichier `.npmrc` avec
`legacy-peer-deps=true` est déjà présent dans le dossier du projet pour l'automatiser.
