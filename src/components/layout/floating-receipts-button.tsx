
"use client";

import React, { useState } from 'react';
import { Receipt, X, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import type { PendingReceipt } from '@/lib/types';
import { useRouter } from 'next/navigation';


export function FloatingReceiptsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { pendingReceipts, clearPendingReceipts } = useAuth();
  const router = useRouter();

  const handlePrintAll = () => {
    sessionStorage.setItem('pendingReceipts', JSON.stringify(pendingReceipts));
    router.push('/receipt/combined');
    setIsOpen(false);
  };

  const handleClear = () => {
    clearPendingReceipts();
    setIsOpen(false);
  };

  if (!pendingReceipts || pendingReceipts.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="secondary"
        className="fixed bottom-24 md:bottom-4 right-4 z-50 rounded-full h-14 w-14 p-0 shadow-lg hover:scale-110 transition-transform duration-200 overflow-visible"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ouvrir les reçus en attente"
      >
        <Receipt className="h-6 w-6" />
        {pendingReceipts.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0"
          >
            {pendingReceipts.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card
          className="fixed z-40 shadow-2xl animate-in fade-in-50 zoom-in-95 w-[calc(100vw-2rem)] md:w-[350px] bottom-40 md:bottom-20 right-4"
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Reçus en Attente
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Transactions récentes non imprimées.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {pendingReceipts.map(receipt => (
                <div key={receipt.id} className="flex justify-between items-center text-sm">
                  <span className="truncate pr-2">{receipt.description}</span>
                  <span className="font-mono font-semibold whitespace-nowrap">
                    {receipt.type === 'expense' ? '-' : '+'}
                    {receipt.amount.toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t flex flex-col gap-2">
            <Button variant="outline" className="w-full" onClick={handlePrintAll}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer le reçu combiné
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" /> Vider la liste
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
