
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingOverlay } from '@/components/layout/loading-overlay';

interface LoadingContextType {
  showLoader: () => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  const hideLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Hide loader on path change
  useEffect(() => {
    hideLoader();
  }, [pathname, hideLoader]);

  const showLoader = useCallback(() => {
    setIsLoading(true);
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      <React.Fragment>
        {isLoading && <LoadingOverlay />}
        {children}
      </React.Fragment>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
