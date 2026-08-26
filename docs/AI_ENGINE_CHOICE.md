# Choix du moteur d'échecs IA

## Décision : pas de Stockfish, moteur JS/TS maison

Le cahier des charges demandait Stockfish (ou une alternative fiable si Stockfish pose
problème). Après évaluation, **Wizard Chest n'utilise pas Stockfish** et embarque à la place un
moteur de recherche minimax/alpha-bêta écrit entièrement en TypeScript
([`src/engine/search.ts`](../src/engine/search.ts)).

## Pourquoi pas Stockfish

- **Stockfish natif (WASM)** : Hermes, le moteur JavaScript utilisé par défaut par React
  Native/Expo, ne supporte pas WebAssembly. `stockfish.wasm` ne peut donc pas tourner tel quel
  dans une app Expo en JS Engine par défaut.
- **Stockfish via module natif** (ex. bindings iOS/Android compilés) : nécessite de sortir du
  workflow Expo managé (config plugin + `expo-dev-client` + build natif custom), impossible à
  tester dans Expo Go, et impossible à valider dans cet environnement de développement (pas de
  simulateur/appareil physique disponible ici). Le risque de livrer une intégration non testée,
  potentiellement cassée, était jugé trop élevé.
- Le cahier des charges est explicite : *« Ne laisse pas une fausse implémentation ou une IA qui
  joue au hasard. »* — la priorité a donc été mise sur un moteur **réellement fonctionnel,
  testé, et dont la force est ajustable**, plutôt que sur une intégration Stockfish non
  vérifiable.

## Ce qu'implémente le moteur maison

- **Négamax avec élagage alpha-bêta**, tri des coups (captures MVV-LVA, promotions, coups
  tueurs, table d'historique) pour un élagage efficace.
- **Recherche par approfondissement itératif** bornée en temps (`timeBudgetMs`), donc le moteur
  ne bloque jamais indéfiniment : il rend le meilleur coup trouvé dans le budget de temps
  imparti, même si la profondeur cible n'est pas atteinte.
- **Recherche de quiescence** (captures uniquement, jusqu'à 6 demi-coups) aux feuilles, pour
  éviter l'effet d'horizon (ne pas rendre un coup qui perd une pièce juste après l'évaluation).
- **Fonction d'évaluation** : valeurs de matériel classiques + tables positionnelles
  (« piece-square tables ») par type de pièce, phase milieu/finale pour le roi, bonus de
  mobilité, pénalité d'échec, et petits ajustements de style (agressif/prudent/tactique/
  positionnel/amateur) qui influencent légèrement l'évaluation sans jamais rendre un coup
  illégal.
- **Difficulté par division** : chaque division définit une profondeur de recherche plafond
  (`aiDepth`, 1 à 8) et un « bruit de compétence » (`aiSkillNoise`, 0 à ~0.55). Ce bruit ne rend
  jamais un coup absurde : avec probabilité `aiSkillNoise`, le moteur choisit un coup parmi ceux
  dont le score est à moins de 120 centipawns du meilleur coup trouvé (voir
  [`src/engine/difficulty.ts`](../src/engine/difficulty.ts)) — jamais un coup catastrophique
  hors de cette fenêtre.
- **Délai de réflexion naturel et variable** : après calcul, le temps de réponse total est ajusté
  pour tomber dans une fenêtre aléatoire dépendant de la profondeur (400 ms–1.8 s, volontairement
  courte pour ne jamais paraître longue), pour éviter les réponses instantanées systématiques,
  sans jamais raccourcir un calcul déjà plus long que la fenêtre cible.

## Sorts éphémères et légalité des échecs

Les 4 sorts (`src/domain/spells.ts`, `src/engine/spellEffects.ts`, `src/engine/leapMoves.ts`)
modifient le plateau en dehors du flux normal `chess.move()`, mais **jamais** en contournant les
garanties de légalité de `chess.js` :

- **Explosion** et **Téléportation** utilisent les méthodes bas niveau `chess.put()` /
  `chess.remove()` de chess.js, qui recalculent automatiquement les droits de roque et la prise
  en passant après chaque mutation. Le trait (à qui de jouer) n'est jamais modifié par un sort —
  lancer un sort ne fait donc jamais changer de joueur, conformément à la règle « un sort ne
  passe pas ton tour ».
- **Saut** génère ses propres destinations « en ignorant les blocages » (`getLeapDestinations`),
  puis **filtre systématiquement** toute destination qui laisserait son propre roi en échec, en
  simulant le coup sur un plateau cloné et en interrogeant `chess.isAttacked()` — exactement la
  même garantie que `chess.js` applique nativement à tout coup normal. Une fois la destination
  choisie, le coup est appliqué et le trait bascule vers l'adversaire comme un coup normal.
- **Bouclier** ne modifie jamais le plateau : il retire uniquement, pour le tour suivant de
  l'adversaire, les coups de recherche de l'IA qui captureraient la case protégée
  (`computeAiMove({ protectedSquare })`), sans jamais rendre un coup normalement légal illégal
  pour autant — l'IA choisit simplement parmi ses coups restants.
- Aucun sort ne peut jamais capturer un roi : Explosion et Téléportation excluent explicitement
  les cases occupées par un roi.
- Après Explosion ou Téléportation, une vérification systématique (`checkForSpellInducedGameOver`)
  détecte si le joueur vient de se mettre lui-même échec et mat ou pat (cas extrême mais possible
  si un pion protégeant son propre roi est sacrifié) et termine la partie en conséquence — les
  sorts ne peuvent donc jamais laisser la partie dans un état incohérent.

Cette séparation stricte (chess.js reste l'unique source de vérité sur la légalité et l'état du
jeu ; les sorts ne font que des mutations de plateau explicitement validées) est ce qui garantit
que les vraies règles des échecs et les sorts ne se perturbent jamais mutuellement. Voir
[`src/engine/leapMoves.test.ts`](../src/engine/leapMoves.test.ts) et
[`src/engine/spellEffects.test.ts`](../src/engine/spellEffects.test.ts) pour les tests dédiés.

## Limites connues et honnêtes

- Ce n'est **pas** un moteur de niveau compétition (pas de table de transposition, pas
  d'extensions de recherche avancées, profondeur plafonnée à 8). Sa force est largement
  suffisante pour un adversaire crédible du niveau Bois au niveau Sorcier Suprême tel que défini
  par les divisions, mais ne rivalise pas avec un vrai Stockfish à haute profondeur.
- La recherche est **synchrone** (bloque le thread JS pendant son calcul). Le budget de temps est
  volontairement plafonné (2.8 s max) pour limiter l'impact sur la fluidité de l'interface, mais
  sur un téléphone bas de gamme, les divisions les plus fortes (profondeur 6-8) peuvent
  occasionner un léger gel de l'interface pendant le calcul du coup adverse. Une amélioration
  future possible : découper la recherche en tranches asynchrones (yield périodique), ou
  basculer vers une intégration Stockfish native une fois un build de développement personnalisé
  disponible pour la tester réellement.

## Tests

La légalité des coups, la détection de mat, et la sélection de coup avec bruit de compétence
sont couvertes par des tests unitaires : [`src/engine/search.test.ts`](../src/engine/search.test.ts)
et [`src/engine/difficulty.test.ts`](../src/engine/difficulty.test.ts).
