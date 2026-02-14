
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/auth-provider";
import { LoadingProvider } from '@/providers/loading-provider';
import dynamic from 'next/dynamic';
import React from 'react';
import { TimeSyncGuard } from '@/components/layout/time-sync-guard';

// Dynamically import ThemeProvider to ensure it's client-side only
const DynamicThemeProvider = dynamic(() => import('@/providers/dynamic-theme-provider').then(mod => mod.DynamicThemeProvider), { ssr: false });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>TTR gestion | la meilleur application de gestion simplifier assister par ia</title>
        <meta name="description" content="nous metons un outils très puis a votre disposition pour securiser votre business a un prix ultra accessible" />
        <meta name="google-site-verification" content="djLBD9J-mg8N9y3C-8aHUwtPCWAQBQkRzAy4vTGb1Ss" />
        <meta name="google" content="notranslate" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/ttr gestion.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TTR Gestion" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <DynamicThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LoadingProvider>
            <AuthProvider>
              <TimeSyncGuard>
                <div key="layout-wrapper">
                  {children}
                </div>
              </TimeSyncGuard>
            </AuthProvider>
            <Toaster />
          </LoadingProvider>
        </DynamicThemeProvider>
      </body>
    </html>
  );
}
