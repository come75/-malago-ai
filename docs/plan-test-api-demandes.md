# Plan de vérification — API des demandes clients

Ce plan doit être exécuté sur un environnement de test, après configuration du binding D1 et du secret administrateur. Aucun déploiement de production n'est autorisé tant que ces contrôles ne sont pas passés.

## Préparation
- [ ] Confirmer que le Worker de test cible la base D1 `malago-client-requests`.
- [ ] Ajouter `MALAGO_ADMIN_TOKEN` comme secret Worker côté Cloudflare ; ne jamais l'inscrire dans un fichier suivi par Git.
- [ ] Utiliser uniquement des données fictives.
- [ ] Vérifier les cinq tables et leurs colonnes avec Explore Data / Console.

## Tests administrateur
- [ ] Sans Authorization : `POST /api/admin/stays` doit répondre 401.
- [ ] Avec secret absent côté Worker : les routes admin doivent répondre 503.
- [ ] Avec secret valide : créer un séjour de test doit répondre 201 et renvoyer un jeton une seule fois.
- [ ] Vérifier dans D1 que seul le hash du jeton est stocké, jamais le jeton brut.
- [ ] Créer un séjour sans propriété doit répondre 400.
- [ ] Lister les demandes via `GET /api/admin/requests`.
- [ ] Révoquer les jetons d'un séjour et vérifier que l'ancien jeton ne permet plus l'accès.

## Tests client
- [ ] Sans jeton, avec jeton aléatoire, révoqué ou expiré : `GET /api/client/requests` doit répondre 401.
- [ ] Avec un jeton valide : lister uniquement les demandes du séjour concerné.
- [ ] Catégorie inconnue ou description trop courte : `POST /api/client/requests` doit répondre 400.
- [ ] Demande valide : réponse 201, statut initial `received`, événement d'historique présent.
- [ ] Vérifier qu'un séjour ne peut pas lire les demandes d'un autre séjour.

## Statuts et historique
- [ ] Changer un statut via la route admin crée un événement d'historique.
- [ ] Tentative de passer à `confirmed` sans note : réponse 400.
- [ ] Passage à `confirmed` depuis `accepted_by_customer`, avec une note attestant la confirmation du prestataire : événement enregistré.
- [ ] Tentative de passer directement de `received` à `confirmed` : réponse 409.
- [ ] Tentative de rouvrir une demande `declined` ou `cancelled` : réponse 409.
- [ ] Répéter le statut déjà actif : réponse 200 sans créer un doublon d'événement.
- [ ] Vérifier que le site n'annonce jamais qu'une demande est une réservation simplement parce qu'elle a été envoyée.

## Critères de validation
Tous les tests d'accès autorisés/refusés et d'isolation entre séjours doivent réussir. Vérifier les journaux sans y exposer les jetons ni des données client inutiles. Les notifications, le portail client visuel et le tableau de bord restent hors périmètre de cette API initiale.
