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

- Stockage serveur persistant via Cloudflare D1.
- Aucun accès à une demande sur la seule base d'un identifiant devinable.
- Liens clients avec jeton aléatoire à forte entropie ; ne stocker que le hash du jeton. Prévoir expiration, révocation et rotation.
- Le lien de l'espace client utilise le fragment `#token=...` : le jeton n'est pas envoyé au serveur avec la requête initiale de la page. La page le retire ensuite de la barre d'adresse et le conserve dans la session de l'onglet.
- Ne jamais placer nom, e-mail, téléphone ou détails de séjour dans l'URL.
- Vérifier côté serveur les droits sur le séjour pour chaque lecture ou modification.
- Valider les tailles des champs côté serveur ; prévoir une protection anti-abus avant la mise en production.
- Notifications minimales : pas de documents ni de données sensibles dans le texte WhatsApp/e-mail ; lien vers l'espace authentifié.
- Prévoir une durée de conservation, une procédure d'export/suppression et des journaux d'accès adaptés.
- Les secrets restent dans les secrets Cloudflare, jamais dans le code ni dans le navigateur public.

## Ce qui est présent dans la branche de travail

Branche : `feat/client-request-system-foundation`  
Pull request : [PR #5 — Prepare Malago client request system foundation](https://github.com/come75/-malago-ai/pull/5)  
La branche de production `villa-magos-premium` n'a pas été fusionnée ni modifiée par ces travaux.

### API Worker

- `POST /api/admin/stays` : crée un séjour et génère un jeton privé valable 30 jours. Exige `Authorization: Bearer <MALAGO_ADMIN_TOKEN>`. Le jeton brut est renvoyé une seule fois ; seule son empreinte SHA-256 est stockée.
- `GET /api/admin/requests` : liste les demandes. Exige le secret administrateur.
- `POST /api/admin/requests/:id/status` : change le statut et écrit un événement d'historique. Exige le secret administrateur ; passer à `confirmed` exige une note attestant la confirmation réelle du prestataire.
- `POST /api/admin/stays/:id/revoke-tokens` : révoque les jetons actifs d'un séjour.
- `GET /api/client/requests` : liste uniquement les demandes du séjour autorisé.
- `POST /api/client/requests` : enregistre une demande pour le séjour autorisé.

Les routes client exigent `Authorization: Bearer <jeton de séjour>`. Elles vérifient le hash du jeton, sa révocation, son expiration et l'état du séjour. Les catégories initialement acceptées sont `car_rental`, `airport_transfer`, `restaurant`, `activity`, `chef` et `other`.

### Interfaces ajoutées

- `public/espace-client.html` : interface responsive client, formulaire de demande, historique et statut des demandes. Utilise le jeton privé du séjour.
- `public/admin-demandes.html` : outil interne protégé par le secret administrateur ; création d'un séjour, affichage ponctuel du lien client, consultation de la file et changement de statut.
- Les deux interfaces sont des pages statiques qui appellent l'API Worker ; elles ne nécessitent pas de framework supplémentaire.

### Vérification déjà effectuée

Un test réel sur l'environnement de prévisualisation a créé un séjour fictif et une demande de location de voiture. Le test a confirmé :
- création du séjour ;
- enregistrement de la demande avec statut initial `received` ;
- lecture de la demande dans l'espace client ;
- lecture de la demande dans la liste administrateur.

Ce test n'est pas une validation complète de sécurité et ne représente pas une réservation réelle. Les pages HTML viennent d'être ajoutées à la branche ; il reste à confirmer leur déploiement et leur comportement dans le navigateur de prévisualisation.

## Configuration

Le secret `MALAGO_ADMIN_TOKEN` doit être défini dans les secrets du Worker Cloudflare de prévisualisation avant d'utiliser l'outil interne. Ne pas envoyer ce secret dans le navigateur public, ne pas le committer et ne pas le transmettre dans une capture d'écran. Le jeton administrateur est saisi dans la page interne et conservé uniquement dans la session de l'onglet.

## Architecture restante

- Notifications automatiques : commencer par l'e-mail transactionnel ; ajouter WhatsApp Business API après configuration et validation des coûts. Un lien `wa.me` prérempli n'est pas une notification automatique.
- Proposition et réponse client : permettre au client de consulter un devis et de l'accepter ou de demander une modification ; ce flux n'est pas encore implémenté.
- Sécurité : tester accès sans jeton, jeton invalide, expiration/révocation, isolation entre séjours, validation des entrées, transitions de statut et limitation anti-abus.
- Historique : ajouter une vue permettant à l'équipe de consulter les événements détaillés par demande ; la base enregistre déjà les événements.
- Observabilité : identifiant de demande, erreurs techniques journalisées sans recopier inutilement les données client.
- Conservation/suppression : définir les durées et la procédure de suppression/export des données.

## Pré-requis avant mise en production

Ne pas annoncer ce flux comme opérationnel pour les voyageurs avant :
1. confirmation du déploiement des deux interfaces en prévisualisation ;
2. tests des accès autorisés et refusés, y compris l'isolation entre deux séjours ;
3. tests des transitions de statut et de l'historique ;
4. ajout de protections anti-abus et de limites de requêtes ;
5. définition du processus humain de traitement des demandes et des notifications ;
6. revue finale des secrets, journaux, conservation et suppression des données.

## Découpage conseillé

1. Valider les deux interfaces sur l'environnement de prévisualisation.
2. Compléter les tests de sécurité et d'isolation.
3. Ajouter les notifications e-mail.
4. Implémenter l'échange de proposition et de réponse client.
5. Tester les scénarios d'erreur et la révocation des liens.
6. Effectuer une revue avant toute fusion ou déploiement en production.
