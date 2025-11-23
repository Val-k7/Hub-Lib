# Hub-Lib 📚

Une plateforme moderne de partage et de découverte de ressources pour développeurs. Partagez vos snippets, configurations, templates et documentation avec la communauté.

## 🎯 Fonctionnalités Principales

### ✅ Implémenté

- **Authentification complète**
  - Connexion par email/mot de passe
  - Connexion OAuth (GitHub, Google) - simulée en local
  - Gestion de session persistante
  - Rôles utilisateur (admin/user)

- **Gestion des ressources**
  - Création, édition et suppression de ressources
  - Duplication de ressources (Fork)
  - Support de multiples types : fichiers uploadés, liens externes, repos GitHub
  - Upload de fichiers avec validation et prévisualisation
  - Système de tags et catégories
  - Recherche full-text améliorée (titre, description, README, tags, langage)
  - Filtres avancés (date, auteur, licence, langage, catégorie, tags, visibilité)
  - Système de notation (ratings)
  - Compteurs de vues et téléchargements
  - Système de commentaires avec réponses

- **Organisation et découverte**
  - Navigation par catégories
  - Filtres avancés (tags, visibilité, type, note)
  - Modes d'affichage (grille/liste)
  - Ressources sauvegardées (favoris)
  - Profils utilisateurs publics

- **Partage et collaboration**
  - Partage de ressources avec utilisateurs ou groupes
  - Permissions granulaires (lecture seule / lecture-écriture)
  - Partage avec expiration (date/heure)
  - Gestion des groupes avec rôles (admin/membre)
  - Recherche d'utilisateurs pour ajout aux groupes
  - Notifications en temps réel améliorées (polling optimisé)
  - Visibilité configurable (public/privé/partagé)

- **Communauté**
  - Suggestions de catégories/tags
  - Système de votes pour les suggestions
  - Panneau d'administration pour modération
  - Statistiques de navigation

- **Interface utilisateur**
  - Design moderne et responsive
  - Mode sombre/clair
  - Animations fluides
  - États de chargement et vides
  - Virtualisation pour les grandes listes
  - Images optimisées avec lazy loading et blur-up
  - Pagination côté client
  - Statistiques utilisateur avec graphiques (Recharts)

- **Gestion des données**
  - Export/Import de données au format JSON
  - Migration entre instances
  - Gestion complète des données depuis le profil

- **Profils utilisateurs**
  - Édition de profil avec upload d'avatar
  - Statistiques détaillées avec graphiques
  - Affichage des ressources publiques
  - Graphiques d'évolution mensuelle
  - Top ressources populaires

## 🛠️ Technologies

- **Frontend**
  - React 18.3 avec TypeScript
  - Vite pour le build
  - React Router pour la navigation
  - TanStack Query pour la gestion d'état serveur
  - Framer Motion pour les animations

- **UI/UX**
  - shadcn/ui (Radix UI)
  - Tailwind CSS
  - Lucide React pour les icônes
  - Sonner pour les notifications toast

- **Stockage**
  - localStorage (client local)
  - Pas de backend requis

## 📦 Nouvelles Fonctionnalités (v1.0.0)

### Dernières Ajoutées
- ✅ **Système de commentaires** : Commentez et répondez aux ressources
- ✅ **Statistiques utilisateur** : Graphiques d'évolution et analyses
- ✅ **Permissions granulaires** : Contrôle fin des partages avec expiration
- ✅ **Export/Import** : Sauvegardez et restaurez vos données
- ✅ **Images optimisées** : Lazy loading avec blur-up et placeholders
- ✅ **Pagination** : Navigation efficace pour grandes listes

Voir [CHANGELOG.md](./CHANGELOG.md) pour la liste complète des changements.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+ et npm

### Installation

```bash
# Cloner le repository
git clone <votre-repo-url>
cd Hub-Lib

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Scripts Disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run build:dev    # Build en mode développement
npm run lint         # Linter le code
npm run preview      # Prévisualiser le build de production
```

## 📁 Structure du Projet

```
Hub-Lib/
├── src/
│   ├── components/          # Composants réutilisables
│   │   ├── ui/              # Composants UI de base (shadcn)
│   │   └── ...              # Composants métier
│   ├── pages/               # Pages de l'application
│   ├── hooks/               # Hooks React personnalisés
│   ├── integrations/        # Intégrations externes
│   │   └── local/           # Client local (localStorage)
│   ├── lib/                 # Utilitaires
│   ├── types/               # Types TypeScript
│   └── constants/           # Constantes
├── public/                  # Assets statiques
└── package.json
```

## 🗂️ Pages Disponibles

- `/` - Page d'accueil avec présentation
- `/browse` - Navigation et recherche de ressources
- `/resource/:id` - Détails d'une ressource
- `/create-resource` - Création de ressource
- `/my-resources` - Mes ressources créées et sauvegardées
- `/profile/:username` - Profil utilisateur
- `/shared-with-me` - Ressources partagées avec moi
- `/groups` - Gestion des groupes
- `/categories-tags` - Suggestions de catégories/tags
- `/admin` - Panneau d'administration
- `/auth` - Authentification

## 🔐 Authentification

L'application utilise un système d'authentification local :

- **Compte admin par défaut** : `admin@example.com` (créé automatiquement)
- **Création de compte** : N'importe quel email/mot de passe crée un compte
- **OAuth** : GitHub et Google sont simulés (créent des comptes de démonstration)

## 💾 Stockage Local

Toutes les données sont stockées dans le navigateur via `localStorage` :

- **Préfixe des tables** : `hub-lib-db-`
- **Clé d'authentification** : `hub-lib-auth`
- **Limite** : ~5-10MB par domaine (limite du navigateur)

### Réinitialisation

Pour réinitialiser toutes les données :

```javascript
// Dans la console du navigateur
localStorage.clear()
// Puis recharger la page
```

## 🎨 Personnalisation

### Thème

L'application supporte le mode sombre/clair automatique basé sur les préférences système. Le thème peut être changé via le toggle dans le header.

### Configuration

Les constantes et configurations sont dans :
- `src/constants/index.ts` - Constantes de l'application
- `tailwind.config.ts` - Configuration Tailwind

## 📊 Performance

L'application utilise plusieurs optimisations :

- **Code splitting** : Pages chargées à la demande
- **Virtualisation** : Listes virtuelles pour grandes collections
- **Cache** : TanStack Query avec cache intelligent
- **Lazy loading** : Images et composants chargés à la demande

## 🧪 Développement

### Standards de Code

- TypeScript strict
- ESLint pour le linting
- Composants fonctionnels avec hooks
- Séparation des responsabilités

### Ajout de Fonctionnalités

1. Créer les hooks nécessaires dans `src/hooks/`
2. Ajouter les types dans `src/types/`
3. Créer les composants dans `src/components/`
4. Ajouter les routes dans `src/App.tsx`

## 📝 Documentation Complémentaire

- [ROADMAP.md](./ROADMAP.md) - Tâches et fonctionnalités à venir
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture technique détaillée
- [CHANGELOG.md](./CHANGELOG.md) - Historique des changements
- [SUMMARY.md](./SUMMARY.md) - Résumé des accomplissements
- [CHANGELOG.md](./CHANGELOG.md) - Historique des changements
- [SUMMARY.md](./SUMMARY.md) - Résumé des accomplissements

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez la [ROADMAP.md](./ROADMAP.md) pour voir les tâches en cours.

## 📄 Licence

Ce projet est sous licence MIT.

## 🙏 Remerciements

- [shadcn/ui](https://ui.shadcn.com/) pour les composants UI
- [Radix UI](https://www.radix-ui.com/) pour les primitives accessibles
- [Tailwind CSS](https://tailwindcss.com/) pour le styling
- [Lucide](https://lucide.dev/) pour les icônes
