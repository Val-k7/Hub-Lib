# Guide de Contribution - Hub-Lib

Merci de votre intérêt pour contribuer à Hub-Lib ! Ce guide vous aidera à démarrer.

## 🚀 Démarrage Rapide

1. **Fork le projet**
2. **Clone votre fork**
   ```bash
   git clone https://github.com/votre-username/Hub-Lib.git
   cd Hub-Lib
   ```

3. **Installer les dépendances**
   ```bash
   npm install
   ```

4. **Lancer l'application en développement**
   ```bash
   npm run dev
   ```

## 📝 Standards de Code

### TypeScript

- Utiliser TypeScript strict
- Typage explicite pour les fonctions publiques
- Éviter `any` autant que possible

### Style de Code

- Suivre les règles ESLint configurées
- Formatage automatique avec Prettier (si configuré)
- Composants fonctionnels avec hooks
- Nommage en camelCase pour les variables/fonctions
- Nommage en PascalCase pour les composants

### Structure des Fichiers

```
src/
├── components/     # Composants React
├── hooks/          # Hooks personnalisés
├── lib/            # Utilitaires
├── services/       # Services métier
├── pages/          # Pages de l'application
├── types/          # Types TypeScript
└── test/           # Tests
```

## 🧪 Tests

### Lancer les Tests

```bash
# Tous les tests
npm run test

# Tests en mode watch
npm test

# Coverage
npm run test:coverage

# Tests d'accessibilité
npm run test:run
```

### Écrire des Tests

- Un fichier de test par composant/hook/utilitaire
- Nommer les fichiers `*.test.ts` ou `*.test.tsx`
- Utiliser Vitest et React Testing Library
- Tester les cas d'usage principaux et les cas limites

Exemple :

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { container } = render(<MyComponent />);
    expect(container).toBeTruthy();
  });
});
```

## ♿ Accessibilité

- Tous les composants doivent être accessibles au clavier
- Ajouter des attributs ARIA appropriés
- Tester avec les lecteurs d'écran
- Vérifier le contraste des couleurs
- Voir [docs/ACCESSIBILITY.md](./ACCESSIBILITY.md) pour plus de détails

## 📚 Documentation

### JSDoc

Documenter toutes les fonctions publiques :

```typescript
/**
 * Calcule la somme de deux nombres
 * 
 * @param a - Premier nombre
 * @param b - Deuxième nombre
 * @returns La somme de a et b
 * 
 * @example
 * ```typescript
 * const result = add(2, 3);
 * // result = 5
 * ```
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

### Composants

- Documenter les props avec TypeScript
- Ajouter des exemples d'utilisation
- Créer des stories Storybook pour les composants UI

## 🔀 Processus de Contribution

1. **Créer une branche**
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```

2. **Faire vos modifications**
   - Écrire du code propre et testé
   - Ajouter des tests si nécessaire
   - Mettre à jour la documentation

3. **Vérifier avant de commit**
   ```bash
   npm run lint
   npm run test:run
   ```

4. **Commit avec un message clair**
   ```bash
   git commit -m "feat: ajouter fonctionnalité X"
   ```

5. **Push vers votre fork**
   ```bash
   git push origin feature/ma-fonctionnalite
   ```

6. **Créer une Pull Request**
   - Décrire les changements
   - Référencer les issues liées
   - Ajouter des captures d'écran si nécessaire

## 📋 Convention de Commit

Utiliser le format [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage, point-virgule manquant, etc.
- `refactor:` Refactoring du code
- `test:` Ajout/modification de tests
- `chore:` Tâches de maintenance

Exemples :
```
feat: ajouter système de recherche avancée
fix: corriger bug de pagination
docs: mettre à jour README
refactor: séparer logique métier dans services
```

## 🐛 Signaler un Bug

1. Vérifier que le bug n'a pas déjà été signalé
2. Créer une issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs réel
   - Environnement (navigateur, OS, version)

## 💡 Proposer une Fonctionnalité

1. Vérifier la roadmap pour voir si c'est prévu
2. Créer une issue avec :
   - Description de la fonctionnalité
   - Cas d'usage
   - Exemples si possible

## ✅ Checklist avant PR

- [ ] Code conforme aux standards
- [ ] Tests passent (`npm run test:run`)
- [ ] Pas d'erreurs de lint (`npm run lint`)
- [ ] Documentation à jour
- [ ] Accessibilité vérifiée
- [ ] Messages de commit clairs

## 🙏 Remerciements

Merci de contribuer à Hub-Lib ! Votre aide est précieuse pour améliorer le projet.


