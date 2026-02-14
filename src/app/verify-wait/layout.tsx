import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export default function VerifyWaitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <main className="w-full max-w-5xl py-8">{children}</main>
       <Link href="https://www.ttrgestion.site/support" target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-50">
        <Button variant="secondary" className="rounded-full h-14 w-14 p-0 shadow-lg hover:scale-110 transition-transform duration-200">
            <HelpCircle className="h-6 w-6" />
            <span className="sr-only">Obtenir de l'aide</span>
        </Button>
      </Link>
    </div>
  );
}
