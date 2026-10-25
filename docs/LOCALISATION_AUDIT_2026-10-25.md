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