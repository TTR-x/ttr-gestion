
"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GlobalSearchContextType {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  openSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ isOpen, setOpen: setIsOpen, openSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (context === undefined) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
}
