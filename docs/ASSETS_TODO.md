# Assets à améliorer avant une sortie « premium » définitive

Tout ce qui suit est **fonctionnel dès maintenant** (l'app tourne, s'affiche et se joue sans
aucun asset manquant) mais reste un placeholder généré par code plutôt qu'un travail artistique
ou audio professionnel. Rien n'est caché : chaque élément listé ici est identifié dans le code
source par un commentaire renvoyant à ce fichier.

## Pourquoi des placeholders générés par code plutôt que des images

Le cahier des charges interdit d'utiliser des assets protégés/copiés et demande, pour les
illustrations complexes impossibles à créer proprement dans ce contexte, des éléments
temporaires **clairement identifiés** plutôt qu'une fausse implémentation. Tous les visuels de
Wizard Chest sont donc soit du vrai code (SVG vectoriel, dégradés, glyphes Unicode stylés), soit
des fichiers audio synthétisés par script — rien n'est une capture d'écran, une image
téléchargée, ou un asset tiers.

## Images

| Élément | Implémentation actuelle | Amélioration suggérée |
|---|---|---|
| Icône d'app / splash / icône adaptative Android | `scripts/generate-icons.js` — SVG généré en code (tour dorée dans un cercle magique), rasterisé en PNG via `sharp` | Faire illustrer un vrai logo par un graphiste (thème « coffre/tour magique », cohérent avec le nom Wizard Chest) |
| Avatars joueur & adversaires | `src/components/Avatar.tsx` — disque dégradé (teinte dérivée du pseudo) + initiales, généré en SVG | Set d'illustrations de portraits fantasy (plusieurs styles, comme demandé dans le cahier des charges) |
| Emblèmes de division | Emoji Unicode (🪵🔶⚪🟡💠💎♞♛🔮) dans `src/domain/divisions.ts` | Blasons/écussons illustrés cohérents avec la DA dark fantasy |
| Pièces d'échecs | Glyphes Unicode (♟♞♝♜♛♚) recolorés, avec halo lumineux optionnel selon le thème | Set de pièces illustrées/3D-isométriques pour les thèmes cosmétiques « Runique » et « Spectral » |
| Textures d'échiquier | Couleurs plates définies dans `src/domain/cosmetics.ts` | Textures pierre/ivoire/obsidienne/marbre réelles (images tileables légères) |
| Captures d'écran App Store / Play Store | — | À produire depuis un vrai build (simulateur iOS / émulateur Android) une fois un compte développeur configuré ; voir `docs/PUBLISHING_CHECKLIST.md` |

## Audio

| Élément | Implémentation actuelle | Amélioration suggérée |
|---|---|---|
| Sons de coup, capture, échec, mat, promotion, clic, début de partie, nulle | `scripts/generate-sounds.js` — tons synthétisés (sinus/triangle avec enveloppe), aucun fichier téléchargé | Vrai sound design (échantillons de bois/pierre, chimes magiques) sous licence libre ou commandé |
| Sons des sorts (or, boutique, achat, Explosion, Téléportation, Bouclier, Saut) | `scripts/generate-sounds.js` — tons/bruits synthétisés (boom, sweep de fréquence, arpèges) | Sound design dédié par sort, plus texturé |
| Musique (3 pistes : Taverne héroïque, Marche épique, Nuit mystique) | `scripts/generate-sounds.js` — séquenceur monophonique synthétisé en code (basse + mélodie + pulsation), aucun échantillon | Composition originale dark fantasy jouée par de vrais instruments/échantillons |

## Typographie

Le texte d'affichage utilise actuellement la police système (Georgia/serif) plutôt qu'une police
sur mesure, pour éviter d'embarquer un fichier de police sans certitude de licence. Une police
d'affichage médiévale/fantasy sous licence libre (ex. via Google Fonts, à vendoriser dans
`assets/fonts/`) renforcerait l'identité visuelle.

## Comment régénérer les placeholders actuels

```bash
npm run generate:sounds   # régénère assets/sounds/*.wav
npm run generate:icons    # régénère assets/images/*.png
```

Ces deux scripts ne téléchargent rien : tout est calculé localement.
