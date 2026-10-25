# Inventaire de localisation — Villa Magos / Malago

**Date d’inspection :** 25 octobre 2026  
**Branche inspectée :** `v7-real-site`  
**Commit de branche vérifié avant ce document :** `7198a47155154528976fba441cb9809775edc9e3`  
**Fichier inspecté :** `public/villa-magos.html` (blob `a3a2f761b312bd553dea61c941d457d2efe7f4b3`, 244 586 caractères au moment de l’inspection).  
**Production :** aucune modification effectuée ; aucun déploiement ni test navigateur/iPhone réalisé.

## Résumé exécutif

L’application actuelle contient une page HTML unique avec le catalogue d’expériences, plusieurs parcours dynamiques, des formulaires de demande et un système de traduction par correspondance de texte. La langue HTML est `en`, mais le contenu source de nombreux composants reste en français. Le sélecteur visible ne propose actuellement que quatre options : anglais, français, espagnol et allemand.

Le système actuel ne constitue pas une base fiable pour dix langues : les textes sont traduits par correspondance exacte de chaînes ; les chaînes inconnues restent inchangées ; les textes produits dynamiquement ne sont pas tous garantis couverts ; les valeurs des options de formulaire sont aussi des données métier et ne doivent pas être changées sans séparer les libellés localisés des valeurs canoniques.

## Faits vérifiés dans le code

- Fichier principal : `public/villa-magos.html`.
- Document : `<html lang="en">`.
- Sélecteur `#malagoLanguageSwitcher` : options actuelles `en`, `fr`, `es`, `de` seulement.
- Le script `malago-language-system` embarque un dictionnaire `D` pour ces quatre codes.
- Comptage statique approximatif des clés textuelles par section du dictionnaire : `en` 79, `fr` 52, `es` 44, `de` 44. Ce comptage reflète les entrées présentes dans le script, pas la couverture complète de l’application ni le nombre de chaînes uniques réellement visibles.
- Le système recherche une correspondance exacte du texte source et remplace le texte du DOM. Si aucune correspondance n’existe, le texte d’origine est conservé : une page peut donc mélanger plusieurs langues sans alerte.
- Un `MutationObserver` tente de traiter les nœuds ajoutés, mais cela ne prouve pas que tous les parcours dynamiques, valeurs de formulaire, erreurs, résumés ou messages générés sont traduits.
- Le document `title` et la meta description sont remplacés par le script pour les quatre langues actuelles.
- Le contenu et les champs dynamiques sont générés à plusieurs endroits dans le fichier ; le texte localisable n’est pas centralisé.
- Aucun dossier `locales/` dédié n’a été trouvé dans l’arborescence consultée précédemment ; à revérifier avant l’implémentation.
- Aucune validation native ni test visuel de la localisation n’est documenté.

## Surfaces à localiser

| ID | Surface | Éléments à inventorier | Risque actuel | Priorité |
| --- | --- | --- | --- | --- |
| L01 | Document et SEO | `lang`, titre, meta description, éventuels canonical/hreflang | Langue déclarée et contenu initial pas nécessairement alignés ; SEO multilingue incomplet | P0 |
| L02 | En-tête et navigation | Liens, label du sélecteur, contact WhatsApp | Mélange potentiel de langues ; accès principal | P0 |
| L03 | Catalogue / catégories | 11 catégories, titres, descriptions, CTA, numéros et textes associés | Correspondance exacte fragile et couverture partielle | P0 |
| L04 | Carrousel éditorial | Kicker, titres, emphases, paragraphes, légendes et textes de chaque slide | Texte français non nécessairement couvert ; longueur mobile | P0 |
| L05 | Parcours principal | Questions, options, étapes, retour/suivant, fermeture et états sélectionnés | Contenu construit depuis des objets JS français | P0 |
| L06 | Détails par prestation | Questions conditionnelles, options et champs propres à chaque demande | Traduction incomplète des options et valeurs dynamiques | P0 |
| L07 | Filtres de demande | Labels, placeholders, options et champs obligatoires/facultatifs | Libellés et valeurs sont mêlés dans les mêmes tableaux | P0 |
| L08 | Parcours Chef | Repas par date, heures, adultes/enfants, cuisine, budget, notes, récapitulatif | Chaînes générées dynamiquement et valeurs de choix à préserver | P0 |
| L09 | Parcours Barman | Fréquence, dates, horaires/durée, invités, boissons, matériel, ambiance, budget | Formulaire complexe, récapitulatif spécifique ; risque de perte de sens | P0 |
| L10 | Autres parcours spécialisés | Mer, décoration, transport, nuit, activités, wellness, famille et autres | Multiples générateurs et branches conditionnelles | P1 |
| L11 | Récapitulatifs / édition | Résumé par prestation, valeurs sélectionnées, retour pour modifier | Les valeurs persistées ne doivent pas être altérées par la locale | P0 |
| L12 | Envoi WhatsApp | Préambule, détails, dates/heures, avertissement de confirmation | Message potentiellement mixte ou valeurs métier traduites de façon incohérente | P0 |
| L13 | Portail / compte / suivi | Libellés, états de demande, boutons et messages d’accès | Périmètre réel à vérifier dans le code et les pages liées | P1 |
| L14 | Validation et erreurs | Champs manquants, alertes, erreurs, confirmations et messages d’état | Plusieurs messages sont codés en dur dans les gestionnaires | P0 |
| L15 | Accessibilité | `alt`, `aria-label`, `title`, labels de champs, annonces accessibles | Certains attributs sont traduits seulement s’ils correspondent exactement au dictionnaire | P1 |
| L16 | Date, heure, nombre et devise | Affichage localisé, séparateurs, devise et pluralisation | Risque de formats incohérents et d’altération des données | P1 |
| L17 | RTL arabe | Direction de page/composants, alignement, ordre de lecture, icônes | Pas de prise en charge RTL vérifiée | P1 |
| L18 | Fallback et contrôle de complétude | Clés manquantes, valeurs vides, locale non approuvée, logs de couverture | Le fallback actuel est silencieux | P0 |

## Catégories et prestations repérées

### Vitrine d’expériences

Le contenu du fichier comprend ces onze catégories affichées dans la vitrine (les libellés doivent être conservés selon la décision produit) :
1. À la villa
2. Services & confort
3. Massages & bien-être
4. Me déplacer
5. En mer
6. Plages & beach clubs
7. Sortir manger
8. Boire un verre
9. Nature & animaux
10. Sport & clubs
11. Autre envie

### Parcours de demande et filtres

Le tableau `FILTERS` repéré dans le script définit des champs pour les clés suivantes :
- `car_rental` — location de voiture ;
- `airport_transfer` — transfert aéroport ;
- `chauffeur` — chauffeur privé ;
- `restaurant` — restaurant ;
- `bar` — sortie / bar ;
- `activity` — activité ;
- `chef` — chef ;
- `groceries` — courses ;
- `beach_club` — beach club ;
- `wellness` — bien-être ;
- `family` — famille ;
- `decoration` — décoration ;
- `bartender` — barman ;
- `dj` — DJ ;
- `event` — événement ;
- `villa_services` — services à la villa ;
- `other` — autre demande.

Ces identifiants sont des données techniques. Les valeurs stockées et envoyées doivent rester stables indépendamment de la langue. Les libellés visibles, les options affichées, les textes d’aide et les messages d’erreur doivent devenir des clés localisables distinctes.

Le code contient également des parcours guidés par univers, dont `villa`, `sea`, `nature`, `transport`, `food`, `chill`, `sport`, `courses`, `beach`, `wellness`, `family`, `decor`, `comfort` et `other`. Les parcours Chef et Barman ont aussi des constructions dédiées ; ils doivent être inventoriés en plus du tableau de filtres.

## Architecture recommandée pour l’inventaire final

Chaque entrée de catalogue doit avoir au minimum les champs suivants :
- `key` : identifiant stable et sémantique, indépendant de la phrase ;
- `source_en` : version anglaise éditoriale approuvée ;
- `context` : page, parcours, composant et étape ;
- `intent` : ce que le texte doit faire comprendre à l’utilisateur ;
- `character_limit` : limite recommandée si la mise en page l’impose ;
- `variable_schema` : variables autorisées et exemple ;
- `canonical_value` : valeur métier si la chaîne est associée à une option de formulaire ;
- `status` : statut éditorial/localisation défini dans le glossaire ;
- `review_note` : remarque de relecture native ou métier.

Exemples de clés :
- `navigation.experiences`
- `home.hero.title`
- `home.carousel.private_chef.title`
- `category.services_comfort.description`
- `request.date.label`
- `request.car_rental.pickup_date.label`
- `request.chef.meal_type.option.breakfast`
- `request.review.title`
- `request.whatsapp.intro`
- `validation.required_field`
- `status.request_pending_confirmation`

## Prochaines étapes techniques — sans toucher à la production

1. Ajouter le schéma des ressources de traduction et les fichiers source anglais avec clés stables.
2. Séparer strictement les identifiants/valeurs canoniques des libellés localisés dans les options et formulaires.
3. Ajouter un validateur automatisé qui compare les clés entre locales, détecte les valeurs vides, clés orphelines et chaînes visibles non répertoriées.
4. Migrer une surface à la fois, d’abord navigation/catégories/carrousel, puis parcours et formulaires.
5. Garder les quatre langues actuelles en état fonctionnel pendant la migration ; ne pas afficher une locale incomplète comme prête.
6. Produire les traductions initiales des six langues supplémentaires seulement à partir d’une source anglaise approuvée, avec statut explicite « brouillon » jusqu’à relecture native.
7. Tester les parcours sur mobile/ordinateur, les textes longs, le changement de langue, les résumés, WhatsApp et RTL.
8. Ne pas publier avant la couverture complète et une validation explicite.

## Décisions, propositions et éléments non vérifiés

### Confirmé
- Dix langues retenues : `en`, `fr`, `es`, `de`, `it`, `nl`, `ru`, `pt`, `ar`, `zh`.
- Anglais comme source éditoriale.
- Adaptation native plutôt que traduction littérale.
- Développement sur `v7-real-site` ; ne pas modifier la production sans autorisation.
- L’interface ne doit pas prétendre qu’une demande est une réservation confirmée.

### Proposition technique
- Ressources structurées en JSON avec clés stables.
- Séparation des chaînes UI et des valeurs métier.
- Contrôle automatisé de couverture et statut par chaîne.
- Activation d’une locale seulement lorsqu’elle est complète et approuvée.

### À vérifier avant l’implémentation complète
- Arborescence exacte du dépôt à la tête de branche la plus récente.
- Toutes les pages réellement servies par le portail client, si elles sont externes au fichier principal.
- Couverture complète des chaînes et messages dynamiques, à établir avec un extracteur plutôt qu’un simple comptage regex.
- Routage et exigences SEO multilingues.
- Variantes régionales de portugais, arabe et chinois.
- Tests navigateur et iPhone ; aucun test de ce type n’a été réalisé dans cette inspection.
