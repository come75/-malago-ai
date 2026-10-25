# Inventaire des formulaires — localisation

Date de lecture : 25 octobre 2026  
Branche : `v7-real-site`  
Source : `public/villa-magos.html`, tableau `VM_REQUEST_FILTERS`.

Cet inventaire reproduit les libellés et options actuellement codés en français. Il sert de base de couverture, pas de validation métier. Les champs doivent garder leur logique et leur ordre pendant la localisation.

## car_rental

- **Date de prise en charge** (`pickup_date`, type `date`)
- **Heure de prise en charge** (`pickup_time`, type `time`)
- **Date de restitution** (`return_date`, type `date`)
- **Heure de restitution** (`return_time`, type `time`)
- **Lieu de livraison** (`pickup_location`, type `select`) — options : « Villa Magos », « Aéroport », « Gare », « Autre adresse »
- **Lieu de restitution** (`return_location`, type `select`) — options : « Même lieu », « Villa Magos », « Aéroport », « Gare », « Autre adresse »
- **Catégorie de véhicule** (`vehicle_type`, type `select`) — options : « Économique », « Compacte », « Berline », « SUV », « Cabriolet », « Familiale », « Premium »
- **Nombre de passagers** (`passengers`, type `number`)
- **Nombre de bagages** (`luggage`, type `number`)
- **Boîte de vitesses** (`transmission`, type `select`) — options : « Automatique », « Manuelle », « Sans préférence »
- **Sièges enfants / rehausseurs** (`child_seats`, type `text`)
- **Budget souhaité** (`budget`, type `text`)
- **Autres besoins** (`extras`, type `textarea`)

## airport_transfer

- **Trajet** (`route`, type `select`) — options : « Aéroport → Villa Magos », « Villa Magos → Aéroport », « Autre trajet », « Aller-retour »
- **Date du trajet** (`date`, type `date`)
- **Heure souhaitée** (`time`, type `time`)
- **Numéro de vol** (`flight_number`, type `text`)
- **Nombre de passagers** (`passengers`, type `number`)
- **Nombre de bagages** (`luggage`, type `number`)
- **Véhicule** (`vehicle_type`, type `select`) — options : « Standard », « Familial », « Van », « Premium »
- **Sièges enfants** (`child_seats`, type `text`)
- **Budget souhaité** (`budget`, type `text`)
- **Précisions** (`notes`, type `textarea`)

## chauffeur

- **Date** (`date`, type `date`)
- **Heure de début** (`start_time`, type `time`)
- **Dates et horaires pour chaque journée** (`dates_schedule`, type `textarea`)
- **Durée de mise à disposition** (`duration_hours`, type `select`) — options : « 2 heures », « 3 heures », « 4 heures », « Demi-journée », « Journée complète », « À préciser »
- **Trajet / itinéraire** (`route`, type `textarea`)
- **Nombre de passagers** (`passengers`, type `number`)
- **Véhicule souhaité** (`vehicle_type`, type `select`) — options : « Berline », « SUV », « Van », « Premium », « Sans préférence »
- **Arrêts supplémentaires** (`stops`, type `text`)
- **Budget souhaité** (`budget`, type `text`)

## restaurant

- **Date souhaitée** (`date`, type `date`)
- **Heure souhaitée** (`time`, type `time`)
- **Moment** (`meal`, type `select`) — options : « Déjeuner », « Dîner », « Brunch », « Autre »
- **Nombre de personnes** (`guests`, type `number`)
- **Type de cuisine** (`cuisine`, type `text`)
- **Ambiance** (`atmosphere`, type `select`) — options : « Romantique », « Familiale », « Festive », « Calme », « Gastronomique », « Locale & authentique »
- **Budget par personne** (`budget`, type `text`)
- **Préférences alimentaires** (`dietary`, type `text`)
- **Allergies / intolérances à signaler** (`allergies`, type `textarea`)
- **Zone souhaitée** (`location`, type `text`)
- **Besoin de transport** (`transport`, type `select`) — options : « Oui », « Non », « À discuter »

## activity

- **Activité souhaitée** (`activity_type`, type `text`)
- **Date souhaitée** (`date`, type `date`)
- **Moment de la journée** (`time`, type `select`) — options : « Matin », « Après-midi », « Soir », « Flexible »
- **Nombre de participants** (`participants`, type `number`)
- **Âges des enfants, si concernés** (`children`, type `text`)
- **Durée souhaitée** (`duration`, type `select`) — options : « 1–2 heures », « Demi-journée », « Journée », « Flexible »
- **Format** (`format`, type `select`) — options : « Privé », « En groupe », « Sans préférence »
- **Budget par personne / total** (`budget`, type `text`)
- **Départ / transport** (`pickup`, type `text`)
- **Langue souhaitée** (`language`, type `text`)
- **Contraintes ou envies** (`notes`, type `textarea`)

## chef

- **Organisation des repas** (`meal_plan`, type `textarea`)
- **Préférences alimentaires** (`dietary`, type `textarea`)
- **Allergies / intolérances à signaler** (`allergies`, type `textarea`)
- **Budget souhaité** (`budget`, type `text`)
- **Service souhaité** (`service`, type `select`) — options : « Repas livré / préparé », « Service à table », « Expérience gastronomique », « À discuter »
- **Courses et ingrédients** (`ingredients`, type `select`) — options : « Inclus dans la proposition », « À préciser »
- **Options ou demandes supplémentaires** (`extras`, type `textarea`)
- **Équipement / besoins cuisine** (`notes`, type `textarea`)

## groceries

- **Date de livraison** (`delivery_date`, type `date`)
- **Créneau souhaité** (`delivery_time`, type `text`)
- **Type de courses** (`order_type`, type `select`) — options : « Courses d’arrivée », « Livraison ponctuelle », « Livraisons multiples »
- **Nombre de personnes** (`people`, type `number`)
- **Liste de courses / catégories** (`list`, type `textarea`)
- **Marques ou préférences alimentaires** (`preferences`, type `textarea`)
- **Produits à éviter** (`avoid`, type `text`)
- **En cas d’indisponibilité** (`substitutions`, type `select`) — options : « Me demander avant remplacement », « Proposer une alternative », « Choisir la meilleure option »
- **Budget approximatif** (`budget`, type `text`)
- **Livraison / rangement souhaité** (`notes`, type `textarea`)

## beach_club

- **Date** (`date`, type `date`)
- **Heure d’arrivée souhaitée** (`arrival_time`, type `time`)
- **Nombre de personnes** (`guests`, type `number`)
- **Réservation souhaitée** (`booking_type`, type `select`) — options : « Transats », « Table », « Lit balinais », « Cabana / espace privé », « Autre / à conseiller »
- **Ambiance** (`atmosphere`, type `select`) — options : « Détente », « Festive », « Chic », « Familiale »
- **Budget total** (`budget`, type `text`)
- **Restauration souhaitée** (`food`, type `select`) — options : « Oui », « Non », « À discuter »
- **Transport depuis la villa** (`transport`, type `select`) — options : « Oui », « Non », « À discuter »
- **Occasion particulière** (`occasion`, type `text`)
- **Préférences / contraintes** (`notes`, type `textarea`)

## wellness

- **Soin souhaité** (`service`, type `select`) — options : « Massage », « Massage en duo », « Yoga », « Fitness », « Soin beauté », « Autre »
- **Date souhaitée** (`date`, type `date`)
- **Horaire souhaité** (`time`, type `time`)
- **Durée souhaitée** (`duration`, type `select`) — options : « 30 min », « 60 min », « 90 min », « 120 min », « À conseiller »
- **Nombre de personnes** (`guests`, type `number`)
- **Lieu** (`location`, type `select`) — options : « À la villa », « Dans un établissement », « Sans préférence »
- **Budget souhaité** (`budget`, type `text`)
- **Préférences à communiquer au praticien** (`notes`, type `textarea`)

## family

- **Besoin famille** (`service`, type `select`) — options : « Baby-sitting », « Lit bébé », « Chaise haute », « Poussette », « Siège auto / rehausseur », « Jeux / accessoires », « Autre »
- **Date souhaitée** (`date`, type `date`)
- **Heure de début** (`start_time`, type `time`)
- **Heure de fin** (`end_time`, type `time`)
- **Nombre d’enfants** (`children_count`, type `number`)
- **Quantité / nombre d’unités** (`quantity`, type `number`)
- **Âges des enfants** (`ages`, type `text`)
- **Langue souhaitée** (`language`, type `text`)
- **Équipement / matériel** (`equipment`, type `textarea`)
- **Budget souhaité** (`budget`, type `text`)
- **Autres besoins à signaler** (`notes`, type `textarea`)

## decoration

- **Occasion** (`occasion`, type `select`) — options : « Anniversaire », « Demande en mariage », « Anniversaire de couple », « Fête / événement », « Surprise », « Autre »
- **Date** (`date`, type `date`)
- **Heure d’installation souhaitée** (`setup_time`, type `time`)
- **Style / couleurs** (`style`, type `text`)
- **Budget total** (`budget`, type `text`)
- **Texte personnalisé** (`message`, type `text`)
- **Installation** (`timing`, type `select`) — options : « Avant l’arrivée », « Le jour même », « Pendant le séjour »
- **Fleurs, gâteau ou autres éléments** (`extras`, type `textarea`)

## bartender

- **Dates, créneaux et durées** (`dates_schedule`, type `textarea`)
- **Nombre d’invités et variation éventuelle** (`guests`, type `text`)
- **Boissons et préférences** (`drinks`, type `textarea`)
- **Fournitures et matériel** (`supplies`, type `textarea`)
- **Fréquence du service** (`service`, type `text`)
- **Ambiance souhaitée** (`ambience`, type `text`)
- **Budget facultatif** (`budget`, type `text`)
- **Demande libre** (`notes`, type `textarea`)

## dj

- **Date** (`date`, type `date`)
- **Heure de début** (`start_time`, type `time`)
- **Heure de fin** (`end_time`, type `time`)
- **Nombre d’invités** (`guests`, type `number`)
- **Styles musicaux** (`music`, type `text`)
- **Son / éclairage** (`equipment`, type `select`) — options : « DJ seul », « Sonorisation incluse », « Son + éclairage », « À discuter »
- **Budget souhaité** (`budget`, type `text`)
- **Contraintes de volume / horaires** (`noise`, type `textarea`)

## event

- **Type d’événement** (`event_type`, type `text`)
- **Date** (`date`, type `date`)
- **Heure de début** (`start_time`, type `time`)
- **Heure de fin** (`end_time`, type `time`)
- **Nombre d’invités** (`guests`, type `number`)
- **Lieu** (`location`, type `select`) — options : « Villa Magos », « Bateau », « Lieu extérieur », « À conseiller »
- **Budget total** (`budget`, type `text`)
- **Prestations à coordonner** (`services`, type `textarea`)
- **Installation / nettoyage** (`setup`, type `textarea`)
- **Contraintes particulières** (`notes`, type `textarea`)

## villa_services

- **Service demandé** (`service`, type `select`) — options : « Ménage supplémentaire », « Linge / blanchisserie », « Préparation de la villa », « Intervention technique », « Assistance », « Autre »
- **Date souhaitée** (`date`, type `date`)
- **Créneau souhaité** (`time`, type `text`)
- **Priorité** (`urgency`, type `select`) — options : « Normale », « Urgente »
- **Zone / équipement concerné** (`location`, type `text`)
- **Description du besoin** (`description`, type `textarea`)
- **Accès à la villa / consignes** (`access`, type `textarea`)
- **Budget éventuel** (`budget`, type `text`)

## other

- **Décrivez votre besoin** (`description`, type `textarea`)
- **Date ou période souhaitée** (`date`, type `text`)
- **Nombre de personnes, si utile** (`people`, type `number`)
- **Lieu** (`location`, type `text`)
- **Budget approximatif (facultatif)** (`budget`, type `text`)
- **Priorité** (`urgency`, type `select`) — options : « Normale », « Urgente »

## État

- 17 catégories de demande repérées.
- Les libellés et options sont actuellement définis dans le code HTML, séparément du catalogue `locales/*.json`.
- Les textes des écrans intermédiaires et certains parcours spéciaux (navigation des expériences, boîte de nuit, voyages express, validation et récapitulatif) sont également codés dans le JavaScript et doivent faire partie de l'inventaire global.
- Ne pas déclarer la localisation complète avant d'avoir raccordé les catalogues, traduit les chaînes dynamiques et testé les dix langues.
