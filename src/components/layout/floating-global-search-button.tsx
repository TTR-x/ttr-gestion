
"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalSearch } from '@/providers/global-search-provider';

import { usePathname } from 'next/navigation';

export function FloatingGlobalSearchButton() {
  const { openSearch } = useGlobalSearch();
  const pathname = usePathname();

  // Hide on overview page as requested
  if (pathname === '/overview' || pathname === '/') {
    return null;
  }

  return (
    <Button
      className={cn(
        "fixed bottom-4 right-20 z-50 rounded-full h-14 w-14 p-0 shadow-lg hover:scale-110 transition-transform duration-200",
        "bg-gradient-to-br from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90"
      )}
      onClick={() => openSearch()}
      aria-label="Recherche globale"
    >
      <Search className="h-6 w-6" />
    </Button>
  );
}
