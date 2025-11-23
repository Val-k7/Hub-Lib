# Guide d'Accessibilité - Hub-Lib

Ce document décrit les pratiques d'accessibilité implémentées dans Hub-Lib pour garantir une expérience utilisateur inclusive conforme aux standards WCAG 2.1 AA.

## 🎯 Standards de Conformité

- **WCAG 2.1 Level AA** : Conformité visée
- **Navigation au clavier** : Support complet
- **Lecteurs d'écran** : Compatible avec NVDA, JAWS, VoiceOver
- **Contraste des couleurs** : Ratio minimum 4.5:1 pour le texte

## ♿ Fonctionnalités d'Accessibilité

### Navigation au Clavier

Tous les composants interactifs sont accessibles au clavier :

- **Tab** : Navigation vers l'élément suivant
- **Shift + Tab** : Navigation vers l'élément précédent
- **Enter / Espace** : Activer un bouton ou lien
- **Flèches** : Navigation dans les listes et menus
- **Échap** : Fermer les modales et menus

### Attributs ARIA

Les composants utilisent des attributs ARIA appropriés :

- `aria-label` : Labels pour les éléments iconiques
- `aria-labelledby` : Association avec les labels visibles
- `aria-describedby` : Descriptions supplémentaires
- `aria-current` : Indication de la page active
- `aria-live` : Annonces dynamiques pour les lecteurs d'écran
- `role` : Rôles sémantiques (navigation, banner, main, etc.)

### Contraste des Couleurs

- Tous les textes respectent un ratio de contraste minimum de 4.5:1
- Les éléments interactifs ont un ratio de 3:1 minimum
- Support du mode sombre avec contraste adapté

### Focus Visible

- Tous les éléments focusables ont un indicateur de focus visible
- Le focus suit l'ordre logique de navigation
- Les styles de focus sont cohérents dans toute l'application

## 🧩 Composants Accessibles

### Boutons

```tsx
<Button aria-label="Action descriptive">
  Action
</Button>
```

### Formulaires

```tsx
<FormItem>
  <FormLabel htmlFor="input-id">Label</FormLabel>
  <FormControl>
    <Input id="input-id" aria-describedby="help-id" />
  </FormControl>
  <FormDescription id="help-id">Aide contextuelle</FormDescription>
</FormItem>
```

### Navigation

```tsx
<nav role="navigation" aria-label="Navigation principale">
  <Link 
    to="/page" 
    aria-current={isActive ? 'page' : undefined}
  >
    Page
  </Link>
</nav>
```

### Modales

```tsx
<Dialog>
  <DialogTrigger aria-label="Ouvrir la modale">
    Ouvrir
  </DialogTrigger>
  <DialogContent aria-labelledby="dialog-title">
    <DialogHeader>
      <DialogTitle id="dialog-title">Titre</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

## 🧪 Tests d'Accessibilité

### Tests Automatisés

Les tests d'accessibilité utilisent `axe-core` :

```bash
npm run test  # Inclut les tests d'accessibilité
```

### Vérification Manuelle

1. **Navigation au clavier** : Tester toute l'application uniquement au clavier
2. **Lecteur d'écran** : Tester avec NVDA, JAWS ou VoiceOver
3. **Contraste** : Utiliser des outils comme WebAIM Contrast Checker
4. **Zoom** : Vérifier que l'application fonctionne à 200% de zoom

## 📋 Checklist d'Accessibilité

### Pour chaque composant :

- [ ] Accessible au clavier
- [ ] Attributs ARIA appropriés
- [ ] Labels descriptifs
- [ ] Contraste suffisant
- [ ] Focus visible
- [ ] Messages d'erreur accessibles
- [ ] Support des lecteurs d'écran

### Pour chaque page :

- [ ] Structure sémantique (header, nav, main, footer)
- [ ] Titre de page unique et descriptif
- [ ] Navigation logique
- [ ] Liens avec texte descriptif
- [ ] Images avec texte alternatif
- [ ] Formulaires avec labels associés

## 🔧 Utilitaires d'Accessibilité

Le fichier `src/lib/accessibility.ts` fournit des utilitaires :

- `generateAriaId()` : Génère des IDs uniques pour ARIA
- `handleKeyboardNavigation()` : Gère la navigation clavier
- `createFormAriaAttributes()` : Crée les attributs ARIA pour les formulaires
- `announceToScreenReader()` : Annonce les changements aux lecteurs d'écran

## 📚 Ressources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

## 🐛 Signaler un Problème

Si vous rencontrez un problème d'accessibilité, veuillez :
1. Décrire le problème en détail
2. Indiquer le navigateur et le lecteur d'écran utilisés
3. Fournir les étapes pour reproduire le problème


