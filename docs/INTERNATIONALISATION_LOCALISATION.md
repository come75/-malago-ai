# Internationalisation & localisation — Malago / Villa Magos

**Statut :** architecture proposée, pas encore implémentée dans l’application  
**Branche de référence :** `v7-real-site`  
**Production :** ne pas modifier dans le cadre de ce chantier.

## Objectif produit

L’anglais devient la langue source éditoriale de référence. Les autres langues ne doivent pas être des traductions mot à mot : chaque version doit sembler avoir été rédigée naturellement par un professionnel natif du marché cible, tout en conservant exactement le sens métier, le niveau de service, les conditions et la voix de marque Malago.

## Règles de qualité non négociables

1. **Transcréation, pas traduction littérale.** Adapter syntaxe, tournures, registre, longueur, expressions et appels à l’action aux usages réels du pays. Ne pas traduire mécaniquement les idiomes.
2. **Relecture native avant publication.** Chaque langue doit être relue par un traducteur/réviseur natif ou un professionnel attestant une maîtrise native du marché ciblé. Une traduction générée par IA peut servir de premier jet, jamais de validation finale.
3. **Glossaire de marque central.** Stabiliser les termes Malago, Villa Magos, concierge, expérience, demande, prestataire, disponibilité, tarif, confirmation, services à la villa, etc. Le glossaire précise le terme préféré, les variantes interdites, le registre et des exemples contextuels.
4. **Contexte fourni aux traducteurs.** Pour chaque chaîne, indiquer l’écran, le public, l’intention, le composant, le nombre de caractères recommandé et, si possible, une capture d’écran. Une même expression ne doit pas être traduite sans contexte.
5. **Sens métier immuable.** Ne jamais changer le sens des conditions, prix, disponibilités, politiques, questions, options, consentements ou messages d’état pour rendre le texte plus fluide.
6. **Localisation régionale.** Définir les variantes utiles (par exemple portugais européen/brésilien ou chinois simplifié/traditionnel) avant de prétendre couvrir ces marchés. Ne pas utiliser une étiquette de langue ambiguë pour plusieurs marchés.
7. **Longueur et mise en page.** Tester les chaînes longues sur mobile, les titres de carrousel, les boutons, les messages WhatsApp et les erreurs de formulaire. Prévoir des variantes courtes uniquement lorsque le sens reste intact.
8. **Accessibilité.** Localiser `lang`, titres de page, `alt`, `aria-label`, annonces d’erreur et textes accessibles, pas seulement le texte visible.
9. **Données distinctes du texte.** Garder les identifiants de catégorie, valeurs de formulaire, statuts et payloads API indépendants de la langue affichée.
10. **Pas de faux “100 % traduit”.** Toute clé visible non validée dans une langue doit être détectée et bloquer la validation de cette langue avant publication.

## Périmètre linguistique

Le code actuel propose anglais, français, espagnol et allemand. L’objectif annoncé est de dix langues. Liste de travail à confirmer à partir de la décision produit déjà prise :

- Anglais — `en` (source éditoriale)
- Français — `fr`
- Espagnol — `es`
- Allemand — `de`
- Italien — `it`
- Néerlandais — `nl`
- Russe — `ru`
- Portugais — `pt` (variante de marché à décider)
- Arabe — `ar` (sens d’écriture RTL à tester)
- Chinois — `zh` (variante simplifié/traditionnel à décider)

**Attention :** cette liste est une hypothèse de travail basée sur les langues citées et le nombre annoncé ; elle n’est pas marquée comme décision confirmée tant que la liste exacte et les variantes régionales ne sont pas retrouvées dans la passation. Ne pas activer les six langues supplémentaires dans l’interface avant validation de leur couverture.

## Architecture technique cible

- Clés de traduction stables et sémantiques, ex. `home.carousel.dj.title`, `category.food.description`, `request.date.label`.
- Fichiers de ressources séparés par locale, avec un schéma identique et des clés stables.
- Un mécanisme d’internationalisation unique utilisé par la navigation, les composants dynamiques, les formulaires, les validations, les récapitulatifs, le portail client et les messages d’envoi.
- Interdire les traductions fondées sur la correspondance exacte avec le texte source ou les modifications globales fragiles du DOM.
- Séparer les chaînes de l’interface des données métier et des réponses persistées.
- Utiliser `Intl.DateTimeFormat`, `Intl.NumberFormat` et des règles adaptées à la locale, sans modifier les valeurs canoniques enregistrées.
- Prévoir pluriels, interpolation de variables, échappement des variables et fallback explicitement signalé en développement/test.
- Détecter les clés absentes, les clés inutilisées, les valeurs vides et les clés ajoutées sans relecture.
- Prévoir une gestion RTL pour l’arabe et des tests d’expansion de texte.

## Workflow de production des contenus

1. Rédiger et valider la version source anglaise avec contexte d’usage.
2. Verrouiller les termes dans le glossaire.
3. Produire une première version localisée par langue.
4. Faire réviser chaque langue par un professionnel natif du marché ciblé.
5. Contrôler la fidélité métier, le ton, les expressions locales, la grammaire et la cohérence terminologique.
6. Faire une relecture en contexte sur mobile et ordinateur, avec captures.
7. Tester formulaires, erreurs, récapitulatifs, WhatsApp, dates, nombres et changement de langue.
8. Enregistrer le statut de chaque chaîne : brouillon, révisée, approuvée, publiée.
9. Bloquer la publication d’une locale si des chaînes visibles ne sont pas approuvées ou si les tests échouent.

## Phasage

1. Confirmer les dix langues et les variantes régionales.
2. Inventorier toutes les chaînes et leur contexte.
3. Définir le glossaire de marque et la convention des clés.
4. Introduire le moteur et les ressources de traduction de façon additive sur la branche de développement.
5. Migrer navigation, métadonnées, catégories et carrousel.
6. Migrer modales, questions conditionnelles, filtres, formulaires et validations.
7. Migrer récapitulatifs, WhatsApp, espace client et calendrier selon le périmètre retenu.
8. Faire réviser les dix locales et tester tous les parcours.
9. Ne proposer la publication qu’après preuve de couverture et validation explicite.

## Décisions / incertitudes

### Confirmé
- L’anglais doit servir de référence éditoriale pour une clientèle internationale (consigne utilisateur dans la conversation).
- La qualité recherchée est une rédaction idiomatique native, pas une traduction littérale.
- Le code actuel propose quatre langues et sa traduction par phrases exactes est incomplète.
- La production ne doit pas être modifiée pendant la migration sans autorisation explicite.

### À confirmer
- La liste exacte des dix langues et les variantes régionales de portugais/chinois/arabe.
- Si le périmètre comprend uniquement Villa Magos ou également le guide général Malago et les interfaces d’administration.
- Le mode de validation native et les personnes/prestataires chargés de l’approbation finale.
- Le routage souhaité par langue et les exigences SEO associées.

### Non effectué
- Aucun code applicatif modifié.
- Aucun test navigateur/iPhone exécuté.
- Aucun déploiement effectué.
