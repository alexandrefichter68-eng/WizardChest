# Démonstration — Verdanjou (entreprise fictive)

## Ce que c'est

Une page vitrine complète, correspondant **exactement** au périmètre vendu 390 € :
une seule page, responsive, six services, zone d'intervention, coordonnées,
titre et description de page.

`index.html` est le fichier livrable autonome (à ouvrir dans un navigateur).
`apercu-artifact.html` est la même page, sans le squelette `<html>/<head>/<body>`,
pour publication en aperçu privé sur claude.ai.

## Ce qui est volontairement absent, et pourquoi

| Absent | Raison |
|---|---|
| Formulaire de contact | Un formulaire sur une page statique n'envoie rien sans service tiers. Plutôt que de faire croire à un envoi, la page utilise des liens `tel:` et `mailto:` qui fonctionnent réellement. |
| Témoignages, avis, labels, chiffres | Aucun n'existe. Inventer un avis client sur une démonstration serait un faux. |
| Photos | Aucune photo libre de droits vérifiable n'était accessible dans cet environnement. La page tient sur la typographie et deux illustrations au trait originales (SVG écrit à la main). Sur un vrai chantier, les photos du client remplacent ces illustrations. |
| Suivi analytique, cookies, pixels publicitaires | Rien n'est chargé côté tiers en dehors de la police Google Fonts. Aucun cookie n'est posé. |

## Coordonnées fictives utilisées

- `02 61 91 04 70` et `06 39 98 04 70` : ces préfixes (`02 61 91`, `06 39 98`)
  font partie des tranches que l'Arcep réserve aux œuvres audiovisuelles et de
  fiction ; ils ne sont attribués à personne et ne peuvent pas être appelés.
  Source : [décision Arcep n° 2018-0881](https://www.arcep.fr/uploads/tx_gsavis/18-0881.pdf).
- `contact@verdanjou.example` : le domaine de premier niveau `.example` est
  réservé à la documentation (RFC 2606), il ne peut pas être enregistré.
- Le nom « Verdanjou » n'a pas fait apparaître d'entreprise existante lors d'une
  recherche du 27/09/2026. Cette vérification est légère : si la démonstration
  doit être diffusée largement, refaire une recherche à l'INPI et au registre
  national des entreprises avant.

## Adapter la démo à un prospect (environ 20 minutes)

1. Supprimer le bloc `<aside class="demo-flag">` et la règle CSS `.demo-flag`
   (tous deux marqués `BLOC DÉMO` dans le fichier).
2. Remplacer le nom, le slogan, les six services, les communes, les coordonnées.
3. Ajuster deux variables de couleur dans `:root` (`--fougere` et `--ardoise`)
   pour coller à l'identité du client.
4. Remplacer les deux illustrations SVG par les photos du client (`<img>` avec
   un attribut `alt` décrivant ce qu'on voit).
5. Compléter le pied de page : SIRET, assurance, directeur de publication, hébergeur.

## Contrôles techniques passés

- Rendu vérifié à 390 px et à 1280 px de large (Chromium sans interface).
- Thème clair et thème sombre définis au niveau des jetons CSS.
- Contrastes calculés sur les couples texte/fond principaux : tous au-dessus de 4,5:1.
- Structure sémantique : `header`, `main`, `section`, `footer`, un seul `h1`,
  lien d'évitement vers le contenu, `:focus-visible` visible au clavier.
- Les deux SVG ont un `role="img"` avec `<title>` et `<desc>` lus par les lecteurs d'écran.
- Aucune dépendance JavaScript. Une seule ressource externe : la feuille de style Google Fonts.
