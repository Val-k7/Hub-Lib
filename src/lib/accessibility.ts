/**
 * Utilitaires pour améliorer l'accessibilité
 */

/**
 * Génère un ID unique pour les attributs ARIA
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Vérifie si un élément est focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return element.matches(focusableSelectors);
}

/**
 * Gère la navigation au clavier dans une liste
 */
export function handleKeyboardNavigation(
  event: React.KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
): void {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      newIndex = (currentIndex + 1) % items.length;
      break;
    case 'ArrowUp':
      event.preventDefault();
      newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      onSelect(currentIndex);
      return;
    default:
      return;
  }

  items[newIndex]?.focus();
  onSelect(newIndex);
}

/**
 * Crée des attributs ARIA pour les composants de formulaire
 */
export function createFormAriaAttributes(
  id: string,
  labelId?: string,
  descriptionId?: string,
  errorId?: string,
  hasError?: boolean
) {
  return {
    id,
    'aria-labelledby': labelId,
    'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': hasError || undefined,
    'aria-required': undefined,
  };
}

/**
 * Vérifie le contraste des couleurs (approximation)
 */
export function checkColorContrast(foreground: string, background: string): boolean {
  // Cette fonction est une approximation simplifiée
  // Pour une vérification complète, utiliser une bibliothèque dédiée
  // comme contrast-ratio ou wcag-contrast
  
  // Conversion simplifiée RGB
  const getLuminance = (color: string): number => {
    // Approximation basique
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0.5;
    
    const [r, g, b] = rgb.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const fgLum = getLuminance(foreground);
  const bgLum = getLuminance(background);
  
  const contrast = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
  
  // WCAG AA nécessite un contraste d'au moins 4.5:1 pour le texte normal
  return contrast >= 4.5;
}

/**
 * Annonce les changements aux lecteurs d'écran
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}


