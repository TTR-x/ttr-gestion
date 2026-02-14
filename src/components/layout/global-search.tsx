
"use client";

import React, { useEffect, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useGlobalSearch } from '@/providers/global-search-provider';
import { useAuth } from '@/providers/auth-provider';
import { getClients, getReservations, getStockItems } from '@/lib/firebase/database';
import { File, User, Package, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  id: string;
  type: 'client' | 'reservation' | 'stock' | 'page';
  name: string;
  description: string;
  href: string;
};

const pages: SearchResult[] = [
  { id: 'page-overview', type: 'page', name: 'Tableau de Bord', description: 'Vue d\'ensemble de l\'activité', href: '/overview' },
  { id: 'page-reservations', type: 'page', name: 'Prestations', description: 'Gérer les réservations, commandes, ventes', href: '/reservations' },
  { id: 'page-clients', type: 'page', name: 'Clients', description: 'Gérer la base de données clients', href: '/clients' },
  { id: 'page-expenses', type: 'page', name: 'Trésorerie', description: 'Suivre les dépenses et revenus', href: '/expenses' },
  { id: 'page-stock', type: 'page', name: 'Stock', description: 'Gérer l\'inventaire', href: '/stock' },
  { id: 'page-investments', type: 'page', name: 'Investissements', description: 'Suivre les projets de croissance', href: '/investments' },
  { id: 'page-planning', type: 'page', name: 'Planning', description: 'Organiser les tâches et rendez-vous', href: '/planning' },
];


export function GlobalSearch() {
  const { isOpen, setOpen, openSearch } = useGlobalSearch();
  const { businessId, activeWorkspaceId, showLoader } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [openSearch]);

  const runSearch = async (currentQuery: string) => {
    setQuery(currentQuery);
    if (!businessId || !activeWorkspaceId || currentQuery.length < 1) {
      setResults(pages);
      return;
    }
    setLoading(true);

    try {
      const lowerQuery = currentQuery.toLowerCase();
      
      const filteredPages = pages.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.description.toLowerCase().includes(lowerQuery)
      );

      if (currentQuery.length < 2) {
        setResults(filteredPages);
        setLoading(false);
        return;
      }

      const [clients, reservations, stockItems] = await Promise.all([
        getClients(businessId, activeWorkspaceId),
        getReservations(businessId, activeWorkspaceId),
        getStockItems(businessId, activeWorkspaceId)
      ]);

      const clientResults = (clients || [])
        .filter(c => c.name.toLowerCase().includes(lowerQuery))
        .map(c => ({
          id: c.id,
          type: 'client' as const,
          name: c.name,
          description: `Client - ${c.phoneNumber}`,
          href: `/clients/${c.id}/edit`
        }));
      
      const reservationResults = (reservations || [])
        .filter(r => r.guestName.toLowerCase().includes(lowerQuery) || r.roomType.toLowerCase().includes(lowerQuery))
        .map(r => ({
          id: r.id,
          type: 'reservation' as const,
          name: r.guestName,
          description: `Prestation - ${r.roomType}`,
          href: `/reservations/${r.id}/edit`
        }));
        
      const stockResults = (stockItems || [])
        .filter(s => s.name.toLowerCase().includes(lowerQuery))
        .map(s => ({
          id: s.id,
          type: 'stock' as const,
          name: s.name,
          description: `Stock - ${s.currentQuantity} ${s.unit}`,
          href: `/stock/${s.id}/edit`
        }));
      
      setResults([...filteredPages, ...clientResults, ...reservationResults, ...stockResults]);

    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (href: string) => {
    showLoader();
    router.push(href);
    setOpen(false);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'client': return <User className="mr-2 h-4 w-4" />;
      case 'reservation': return <File className="mr-2 h-4 w-4" />;
      case 'stock': return <Package className="mr-2 h-4 w-4" />;
      default: return <DollarSign className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Rechercher ou naviguer..." 
        onValueChange={runSearch}
      />
      <CommandList>
        {loading && <CommandEmpty>Recherche en cours...</CommandEmpty>}
        {!loading && results.length === 0 && query && <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>}
        
        <CommandGroup heading="Pages">
          {results.filter(r => r.type === 'page').map(r => (
            <CommandItem key={r.id} onSelect={() => handleSelect(r.href)} value={r.name + r.description}>
              {getIcon(r.type)}
              <span>{r.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        {query.length > 1 && (
          <>
            <CommandGroup heading="Clients">
              {results.filter(r => r.type === 'client').map(r => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.href)} value={r.name + r.description}>
                  {getIcon(r.type)}
                  <span>{r.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Prestations">
               {results.filter(r => r.type === 'reservation').map(r => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.href)} value={r.name + r.description}>
                  {getIcon(r.type)}
                  <span>{r.name} - {r.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Stock">
               {results.filter(r => r.type === 'stock').map(r => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.href)} value={r.name + r.description}>
                  {getIcon(r.type)}
                  <span>{r.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
