# Schéma et contrôles des ressources de localisation

**Branche de travail :** `v7-real-site`  
**Statut :** fondation documentaire et ressource source initiale ; aucun raccordement à l’interface n’est encore réalisé.

## Fichiers

- `locales/en.json` : catalogue anglais source, phase 1 (navigation, catégories et messages communs prioritaires).
- `locales/{locale}.json` : ressource cible à créer uniquement lorsque le contenu localisé peut être suivi et relu.
- `scripts/validate-locales.mjs` : vérifie la validité JSON, le code de locale, les valeurs vides et la parité des clés entre les fichiers présents.

## Structure de ressource

- `_meta` : code de locale, nom, rôle, statut, périmètre et avertissement sur la validation.
- Les autres objets sont organisés par surface produit : `navigation`, `home`, `categories`, `common`, `request`, `validation`, puis les parcours spécialisés.
- Les clés doivent être sémantiques, stables et indépendantes du texte affiché.
- Ne pas réutiliser une clé simplement parce que deux chaînes sont identiques : le contexte peut modifier le sens ou le ton.
- Les valeurs des options de formulaire doivent être séparées des libellés visibles avant la migration des formulaires. Les valeurs métier persistées ou envoyées ne doivent pas changer avec la langue.
- Les variables doivent être nommées et documentées ; éviter de construire une phrase à partir de fragments si l’ordre des mots varie selon la langue.
- Les dates, nombres et montants doivent être formatés avec les APIs de locale appropriées sans modifier les valeurs canoniques.

## Validation

Exécuter depuis la racine du dépôt :

```sh
node scripts/validate-locales.mjs
```

Ce contrôle valide les ressources présentes et signale les locales manquantes comme un état de migration incomplet. Il ne certifie ni la qualité de traduction, ni la couverture du HTML, ni le rendu navigateur.

Pour exiger les dix fichiers de locale :

```sh
node scripts/validate-locales.mjs --strict-all-languages
```

Le mode strict doit échouer tant que les dix ressources ne sont pas présentes ou que leur structure ne correspond pas à la source anglaise. Ne pas lancer le mode strict comme preuve de couverture de l’interface avant l’inventaire complet.

## Limites et garde-fous

- `locales/en.json` est un premier lot, pas un inventaire exhaustif de tous les textes du site.
- Les fichiers ne sont pas encore chargés par `public/villa-magos.html`. Cette fondation est donc additive et n’altère pas le comportement du site.
- Le validateur ne peut pas repérer une chaîne française codée en dur dans le HTML ; un extracteur/inventaire de chaînes et des tests de parcours restent nécessaires.
- L’existence d’un fichier locale ne vaut pas approbation native. Le statut doit être explicite et les textes non relus ne doivent pas être activés comme version finale.
- Aucun test navigateur, iPhone, déploiement ou test de production n’est revendiqué.
