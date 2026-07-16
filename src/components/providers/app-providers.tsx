'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ConvexProvider } from '@/components/providers/convex-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProvider>{children}</ConvexProvider>
    </SessionProvider>
  );
}
