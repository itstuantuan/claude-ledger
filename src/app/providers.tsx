'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    mutationCache: new MutationCache({ onError: (error) => toast.error(errorMessage(error)) }),
    defaultOptions: { queries: { staleTime: 30_000, retry: (count, error) => count < 1 && error instanceof ApiError && error.status >= 500 }, mutations: { retry: false } },
  }));
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (state.user?.id !== previous.user?.id || state.status === 'anonymous') { void client.cancelQueries(); client.clear(); }
    });
    void useUiStore.persist.rehydrate();
    void authApi.restore();
    return unsubscribe;
  }, [client]);
  return <QueryClientProvider client={client}>{children}<Toaster position="bottom-right" closeButton toastOptions={{ className: '!border-[#e1e7da] !bg-[#fcfcfb] !font-sans !text-[#3d5031]' }} /></QueryClientProvider>;
}
