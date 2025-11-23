# Changelog - Hub-Lib

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.0] - 2024

### ✨ Ajouté

#### Fonctionnalités Critiques
- **Recherche d'utilisateurs** : Composant `UserSearch` avec dropdown pour rechercher et ajouter des utilisateurs aux groupes
- **Gestion des rôles dans les groupes** : Interface pour définir et modifier les rôles (admin/membre) des membres de groupe
- **Upload de fichiers** : Système complet d'upload avec validation, prévisualisation et stockage base64
- **Notifications améliorées** : Polling optimisé à 2 secondes avec filtrage par utilisateur connecté

#### Fonctionnalités Importantes
- **Recherche full-text** : Recherche améliorée dans titre, description, README, tags et langage
- **Filtres avancés** : Filtres par date, auteur, licence, langage en plus des filtres existants
- **Édition de ressources** : Page complète pour modifier les ressources existantes
- **Suppression de ressources** : Suppression avec confirmation et cascade (ratings, shares, saved_resources)
- **Duplication de ressources (Fork)** : Bouton Fork pour créer une copie d'une ressource
- **Édition de profil** : Page pour modifier son profil avec upload d'avatar
- **Statistiques utilisateur** : Graphiques avec Recharts (évolution mensuelle, top ressources, répartitions)
- **Permissions granulaires** : Lecture seule / Lecture-écriture avec expiration pour les partages
- **Système de commentaires** : Commentaires avec réponses en arbre, édition et suppression

#### Optimisations
- **OptimizedImage amélioré** : Placeholder avec blur-up, skeleton loading, gestion d'erreurs améliorée
- **Indexation de recherche** : Index pour recherches rapides dans profils et ressources
- **Pagination côté client** : Hook `usePagination` et composant `Pagination` réutilisables
- **Export/Import de données** : Export JSON et import avec validation

### 🔧 Modifié

- `ShareResourceDialog` : Ajout des permissions granulaires et expiration
- `Groups.tsx` : Interface améliorée avec gestion des rôles
- `Profile.tsx` : Ajout des statistiques et gestion des données
- `ResourceDetail.tsx` : Boutons Modifier/Supprimer/Fork + Section commentaires
- `useResourceSharing.tsx` : Support des permissions et expiration
- `useGroups.tsx` : Hook pour mettre à jour les rôles
- `useResources.tsx` : Hooks pour supprimer et dupliquer les ressources
- `localClient.ts` : Indexation, export/import, table `resource_comments`

### 📝 Documentation

- Mise à jour du `README.md` avec toutes les nouvelles fonctionnalités
- Mise à jour de la `ROADMAP.md` avec le statut des tâches
- Création du `CHANGELOG.md`

### 🎨 UI/UX

- Amélioration des composants avec meilleure gestion des états
- Transitions d'opacité pour les images
- Skeleton loaders pour meilleure expérience de chargement
- Messages d'erreur plus clairs

---

## Notes

- Toutes les fonctionnalités critiques et importantes sont maintenant implémentées
- L'application est prête pour les tests et le déploiement
- Les fonctionnalités optionnelles peuvent être ajoutées selon les besoins futurs




