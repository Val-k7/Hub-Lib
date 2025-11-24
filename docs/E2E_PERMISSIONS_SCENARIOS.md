# Scénarios E2E – Gestion des permissions

Ces scénarios sont pensés pour Playwright/Cypress. Ils couvrent les parcours critiques introduits par la nouvelle interface d’administration et les permissions granulaires.

## 1. Création d’une permission
1. Se connecter en `super_admin`.
2. Aller sur `/admin`, onglet **Permissions**.
3. Créer une permission (`resource:test` + description).
4. Vérifier l’apparition immédiate de la permission dans la liste et dans la recherche.

## 2. Assignation / révocation de rôle
1. Depuis l’onglet **Permissions**, sélectionner une permission existante.
2. Assigner la permission au rôle `moderator`.
3. Vérifier l’apparition du badge `moderator`.
4. Retirer la permission via l’icône `X`.
5. Contrôler la disparition du badge.

## 3. Filtrage / recherche
1. Utiliser la barre de recherche avec un mot-clé.
2. Appliquer un filtre de ressource et/ou de rôle.
3. Confirmer que seules les permissions correspondantes s’affichent.

## 4. Journal d’audit & export
1. Se rendre dans l’onglet **Audit** (super_admin).
2. Vérifier la présence des événements créés aux étapes précédentes.
3. Filtrer par action (`PERMISSION_ASSIGNED`) et rôle (`moderator`).
4. Cliquer sur **Exporter CSV** et vérifier la génération du fichier.

## 5. Accès restreint
1. En tant qu’`admin` (non super), vérifier que l’onglet **Permissions** est visible en lecture seule (pas de formulaire de création).
2. Se connecter en utilisateur standard et vérifier la redirection immédiate hors du panneau admin.

## 6. Permissions de ressource
1. Créer une permission explicite sur une ressource (`/api/resources/:id/permissions` via UI ou requête).
2. Vérifier qu’un utilisateur cible peut effectuer l’action (ex: mise à jour) grâce à cette permission.
3. Supprimer la permission et confirmer que l’accès disparaît.

