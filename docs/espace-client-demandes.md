# Espace client Malago — demandes et notifications

## Décision produit

L'espace Malago est la source de vérité des demandes. WhatsApp et l'e-mail sont des alertes, pas des registres de réservation. Une demande envoyée n'est ni un devis accepté ni une prestation confirmée.

## Parcours cible

1. Le voyageur ouvre son dossier de séjour via un lien privé à durée limitée.
2. Il soumet une demande (ex. location de voiture) depuis son espace.
3. Le serveur valide et enregistre la demande dans la base de données avant d'accuser réception.
4. Malago reçoit une alerte e-mail et WhatsApp contenant un résumé minimal et un lien vers le tableau de bord.
5. Malago vérifie les disponibilités, le prix et les conditions auprès du prestataire.
6. Le client consulte la proposition dans son espace et peut l'accepter ou demander une modification.
7. La demande n'est marquée « confirmée » qu'après confirmation réelle du prestataire et vérification des conditions.

## États de demande

- `received` : demande enregistrée, pas encore traitée.
- `in_review` : Malago vérifie les détails ou la disponibilité.
- `awaiting_customer` : une précision ou une décision du client est attendue.
- `quoted` : une proposition a été publiée, sans réservation confirmée.
- `accepted_by_customer` : le client a accepté la proposition, la réservation reste à confirmer.
- `confirmed` : confirmation réelle obtenue et consignée par Malago.
- `declined` : demande impossible ou refusée, avec explication.
- `cancelled` : demande annulée.

Chaque changement d'état doit être daté et attribué à un acteur. Les transitions ne doivent pas être déduites du simple fait qu'un message WhatsApp a été envoyé.

## Données et sécurité

- Stockage serveur persistant (Cloudflare D1 est le choix proposé, cohérent avec le Worker existant).
- Aucun accès à une demande sur la seule base d'un identifiant devinable.
- Liens clients avec jeton aléatoire à forte entropie ; ne stocker que le hash du jeton. Prévoir expiration, révocation et rotation.
- Ne jamais placer nom, e-mail, téléphone ou détails de séjour dans l'URL.
- Vérifier côté serveur les droits sur le séjour pour chaque lecture ou modification.
- Valider et limiter les tailles des champs côté serveur ; appliquer une protection anti-abus.
- Notifications minimales : pas de documents ni de données sensibles dans le texte WhatsApp/e-mail ; lien vers l'espace authentifié.
- Prévoir une durée de conservation, une procédure d'export/suppression et des journaux d'accès adaptés.
- Les secrets d'e-mail et WhatsApp restent dans les secrets Cloudflare, jamais dans le code ni le navigateur.

## Architecture d'implémentation

- Worker : routes API pour créer/lire une demande, consulter l'historique et mettre à jour les états.
- D1 : séjours, jetons d'accès hachés, demandes et événements d'état.
- Interface client : formulaire de demande, confirmation claire, liste et statut des demandes.
- Interface Malago : file de demandes à traiter, filtres par statut/urgence, détail et actions de suivi.
- Notifications : commencer par l'e-mail transactionnel ; ajouter WhatsApp Business API après configuration et validation des coûts. Le lien wa.me prérempli n'est pas une notification automatique.
- Observabilité : identifiant de demande, erreurs techniques journalisées sans recopier inutilement les données client.

## Pré-requis avant mise en production

La branche actuelle n'a pas de liaison D1 configurée dans `wrangler.jsonc`, ni d'API de demandes, ni de portail client authentifié. Il faut créer la base D1 et configurer ses identifiants/bindings dans l'environnement Cloudflare avant de tester le flux réel. Aucun endpoint ne doit prétendre enregistrer une demande tant que cette persistance n'est pas disponible.

## Découpage conseillé

1. Créer la base D1 et appliquer la migration SQL.
2. Implémenter et tester l'accès sécurisé aux dossiers de séjour.
3. Implémenter l'API de création et de suivi des demandes.
4. Construire les interfaces client et Malago.
5. Brancher l'e-mail, puis WhatsApp Business.
6. Tester les accès non autorisés, expiration/révocation des liens, erreurs réseau et transitions de statut avant tout déploiement.
