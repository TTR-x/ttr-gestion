
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.replace('/overview');
      } else {
        router.replace('/login');
      }
    }
  }, [router, currentUser, loading]);

  // The AuthProvider handles the WelcomeSplash screen, so we can return null here to avoid hydration mismatches.
  return null;
}
