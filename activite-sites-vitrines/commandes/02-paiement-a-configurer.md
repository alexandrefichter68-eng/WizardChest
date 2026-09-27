# Encaissement — ce qui est prêt, ce qui ne l'est pas

## État réel

**Aucun prestataire de paiement n'est connecté à cette session.** Les seuls
outils connectés sont la messagerie Gmail et l'accès au dépôt de code.

En conséquence :
- aucun compte marchand n'a été créé ;
- **aucun lien de paiement n'a été généré**, et aucun lien fictif n'a été écrit
  nulle part dans ces documents ;
- aucune coordonnée bancaire n'a été inventée ;
- rien n'a été souscrit ni dépensé en votre nom.

## Ce qui est prêt à être recopié chez votre prestataire

Une fois votre compte ouvert (Stripe, SumUp, PayPal Entreprise, Qonto, ou un
simple virement), créez deux produits avec exactement ces libellés :

| Champ | Produit 1 | Produit 2 |
|---|---|---|
| Nom | Site vitrine une page — acompte | Site vitrine une page — solde |
| Description | Acompte de 50 % sur la réalisation d'un site vitrine d'une page. Déclenche le démarrage. Périmètre défini par la proposition acceptée. | Solde de 50 % sur la réalisation d'un site vitrine d'une page. Dû après validation, avant livraison des fichiers. |
| Prix | 195 € | 195 € |
| TVA | `[à paramétrer selon votre régime]` | `[à paramétrer selon votre régime]` |
| Référence interne | `SV-ACOMPTE` | `SV-SOLDE` |

Description commune à faire figurer sur la facture :

> Réalisation d'un site vitrine d'une page : présentation de l'entreprise,
> jusqu'à six services, zone d'intervention, coordonnées et liens de contact,
> titre et description de page, intégration des photos fournies par le client,
> une série de corrections, livraison des fichiers et d'un guide de prise en main.
> Hors nom de domaine, hébergement et services externes.

## Le virement, si vous n'ouvrez pas de compte marchand

C'est l'option la plus simple pour démarrer, sans frais ni délai d'ouverture.
Il faut alors : une facture d'acompte numérotée, votre IBAN, une référence de
paiement `SV-[AAAA]-[NNN]`, et la vérification effective de l'encaissement sur
votre compte avant de commencer le travail.

## Les six états à ne jamais confondre

Ces états sont ceux du tableau de suivi. Un état ne peut pas être sauté.

| État | Ce que ça veut dire | Ce que ça ne veut PAS dire |
|---|---|---|
| 1. Intérêt exprimé | Le prospect a répondu favorablement | Qu'il achètera |
| 2. Proposition envoyée | Le document est parti | Qu'il l'a lue |
| 3. Commande acceptée | Accord écrit sur le périmètre et le prix | Qu'il a payé |
| 4. Paiement demandé | Facture ou lien envoyé | Qu'il a payé |
| 5. Paiement confirmé | Le prestataire indique la transaction réussie | Que l'argent est disponible |
| 6. Fonds disponibles | Le montant est sur votre compte, hors délai de reversement et hors risque de rétrofacturation | — |

**Le travail ne démarre qu'à l'état 5 pour l'acompte.** Un clic sur un lien de
paiement ou une promesse verbale ne fait avancer aucun de ces états.
