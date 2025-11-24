/**
 * Contexte pour gérer l'ouverture/fermeture de l'overlay de création de ressource
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface CreateResourceContextType {
  isOpen: boolean;
  openCreateResource: (type?: string) => void;
  closeCreateResource: () => void;
  initialType: string | null;
}

const CreateResourceContext = createContext<CreateResourceContextType | undefined>(undefined);

export const CreateResourceProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialType, setInitialType] = useState<string | null>(null);

  const openCreateResource = (type?: string) => {
    setInitialType(type || null);
    setIsOpen(true);
  };

  const closeCreateResource = () => {
    setIsOpen(false);
    setInitialType(null);
  };

  return (
    <CreateResourceContext.Provider
      value={{
        isOpen,
        openCreateResource,
        closeCreateResource,
        initialType,
      }}
    >
      {children}
    </CreateResourceContext.Provider>
  );
};

export const useCreateResource = () => {
  const context = useContext(CreateResourceContext);
  if (!context) {
    throw new Error('useCreateResource must be used within CreateResourceProvider');
  }
  return context;
};

