# Audit de localisation — 25 octobre 2026

## État confirmé

- Branche inspectée : `v7-real-site`.
- Fichier principal : `public/villa-magos.html` (244 586 caractères à la lecture).
- Le sélecteur HTML ne propose que `en`, `fr`, `es`, `de`.
- Le système actuel repose sur un dictionnaire de remplacement de textes exacts, limité à quatre langues. Il ne couvre pas les libellés et options du tableau dynamique `VM_REQUEST_FILTERS`.
- Les catalogues `locales/*.json` existent pour `en`, `fr`, `es`, `de`, `it`, `nl`, `ru`, `pt`, `ar`, `zh`, mais décrivent uniquement `phase-1-navigation-and-category-catalogue`, ne sont pas raccordés au HTML et sont marqués comme brouillons nécessitant une révision.
- Le formulaire dynamique contient des libellés/options français pour 17 types de demande : voiture, transfert aéroport, chauffeur, restaurant, bar, activité, chef, courses, beach club, bien-être, famille, décoration, barman, DJ, événement, services villa, autre.

## Conclusion

La couverture de traduction complète n'est pas atteinte. Ajouter des options au sélecteur seul serait trompeur. Il faut centraliser les chaînes de l'interface, traduire les labels/options/messages des formulaires et du récapitulatif dans les dix langues, connecter les catalogues à l'interface, prendre en charge `lang`/`dir` pour l'arabe et vérifier les parcours dynamiques. Aucun changement de production ni déploiement ne doit être fait sans validation explicite.

## Vérifications non effectuées

- Aucun test navigateur/iPhone ni test interactif de bout en bout.
- Aucun déploiement vérifié.
- Les traductions ne sont pas validées par des locuteurs natifs.

## Avancement du 25 octobre 2026 — intégration initiale en développement

- Nouveau fichier `public/localisation-formulaires.js` créé pour fournir des traductions aux libellés/options dynamiques et à une partie des textes de vitrine dans les dix langues.
- `public/villa-magos.html` mis à jour pour charger ce fichier, proposer les dix langues dans le sélecteur, accepter les dix codes de langue et appliquer `dir="rtl"` en arabe.
- Dictionnaire de traduction : 257 entrées repérées à la lecture statique. Les 214 chaînes uniques de libellés/options extraites des 17 catégories du tableau `VM_REQUEST_FILTERS` sont couvertes par une entrée du dictionnaire.
- Le catalogue couvre aussi une première partie des textes de navigation, descriptions des catégories, titre et métadonnées. Cela ne prouve pas que toutes les chaînes du site sont traduites : les parcours spéciaux, le portail client, les états et messages générés par d'autres scripts nécessitent encore un audit.
- Contrôle effectué : les 6 scripts intégrés présents dans le HTML passent une vérification syntaxique JavaScript via compilation statique ; `public/localisation-formulaires.js` passe également cette vérification.
- Aucun test navigateur, mobile/iPhone, test fonctionnel de changement de langue ou test de bout en bout n'a été effectué. Aucun déploiement n'est confirmé. Les traductions restent des brouillons à relire par des locuteurs natifs.
- La branche `villa-magos-premium` n'a pas été modifiée par ces actions.
