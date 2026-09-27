# Conformité de la prospection B2B par e-mail (France)

> Synthèse des règles applicables au canal utilisé, vérifiée le 27/09/2026 sur le
> site de la CNIL. Ce n'est pas un avis juridique.
> Source principale : [CNIL — La prospection commerciale par courrier électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)

## Le régime applicable à cette activité

Nous démarchons des **professionnels**, pour une offre **en rapport direct avec
leur profession** (un site vitrine pour leur entreprise de paysagisme). Ce cas
relève du régime B2B :

| | Particuliers (B2C) | Professionnels (B2B) |
|---|---|---|
| Base | Consentement **préalable** | Intérêt légitime + **droit d'opposition** |
| Conséquence | Interdit sans accord | Autorisé, si l'objet est en rapport avec la profession |

La CNIL précise en outre que les adresses génériques de personne morale
(`contact@`, `info@`, `commercial@`) ne relèvent pas des principes de
consentement ni d'opposition, car elles ne concernent pas une personne physique.

## Ce que cela impose concrètement, à chaque message

1. **Identifier l'expéditeur sans ambiguïté** : prénom, nom, statut, moyen de
   recontact réel.
2. **Indiquer l'objet en rapport avec la profession du destinataire** dès les
   premières lignes.
3. **Dire d'où vient l'adresse.** Nommer la source publique exacte consultée.
4. **Offrir un moyen simple et gratuit de s'opposer**, dans chaque message
   (« répondez stop » suffit s'il est réellement traité).
5. **Traiter toute opposition immédiatement** et définitivement, tous canaux
   confondus.

## Règles que je m'impose en plus, au-delà du minimum légal

- **Adresses génériques uniquement.** Pas de `prenom.nom@`. Une adresse nominative
  est une donnée personnelle : régime plus lourd, et intrusion plus forte.
- **Jamais d'adresse devinée.** Une adresse est utilisée si et seulement si elle
  a été lue sur une source publique. Aucune construction à partir d'un nom et
  d'un domaine.
- **Un seul canal par entreprise.** Pas d'e-mail + Facebook + téléphone sur la
  même cible pour forcer la réponse.
- **Une relance maximum**, après 5 jours ouvrés sans réponse. Puis plus rien.
- **Aucun fichier de contacts acheté.** Aucun contournement de protection de site,
  aucune extraction automatisée en violation des conditions d'un service.
- **Pas de pièce jointe** dans le premier message.
- **Registre des oppositions** tenu dans `suivi/tableau-de-suivi.csv`
  (statut `refus`), consulté avant tout nouvel envoi.

## Cas particuliers des autres canaux

- **Formulaire de contact du site du prospect** : usage prévu par le prospect
  lui-même, acceptable. Le message doit rester identique en contenu.
- **Page Facebook professionnelle / Messenger** : les conditions d'utilisation de
  la plateforme s'appliquent en plus du droit. À n'utiliser que si la page publie
  explicitement une invitation à être contactée.
- **Téléphone** : Bloctel vise les consommateurs, pas les professionnels démarchés
  sur leur activité. Un appel professionnel à un numéro professionnel publié est
  possible ; il doit s'annoncer clairement et cesser sur demande.

## Mentions à finaliser avant le premier envoi réel

- [ ] identité d'expédition : `[Prénom Nom]`, `[statut juridique]`, `[SIRET]`
- [ ] adresse e-mail d'expédition, avec nom d'affichage lisible
- [ ] adresse postale professionnelle, si elle doit figurer en signature
- [ ] procédure interne de traitement d'un « stop » (qui, en combien de temps)
