/**
 * Contexte pour gérer l'ouverture/fermeture de l'overlay de sélection de template
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface TemplateSelectorContextType {
  isOpen: boolean;
  openTemplateSelector: () => void;
  closeTemplateSelector: () => void;
}

const TemplateSelectorContext = createContext<TemplateSelectorContextType | undefined>(undefined);

export const TemplateSelectorProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openTemplateSelector = () => {
    setIsOpen(true);
  };

  const closeTemplateSelector = () => {
    setIsOpen(false);
  };

  return (
    <TemplateSelectorContext.Provider
      value={{
        isOpen,
        openTemplateSelector,
        closeTemplateSelector,
      }}
    >
      {children}
    </TemplateSelectorContext.Provider>
  );
};

export const useTemplateSelector = () => {
  const context = useContext(TemplateSelectorContext);
  if (!context) {
    throw new Error('useTemplateSelector must be used within TemplateSelectorProvider');
  }
  return context;
};

