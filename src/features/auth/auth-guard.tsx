'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { ErrorState, LoadingState } from '@/components/common/error-state';
export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, error } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  if (status === 'error') return <div className="grid min-h-svh place-items-center bg-[#fcfcfb]"><ErrorState error={new Error(error ?? '会话恢复失败')} retry={() => void authApi.restore()} /></div>;
  if (status !== 'authenticated') return <div className="grid min-h-svh place-items-center bg-[#fcfcfb]"><LoadingState label="正在确认登录状态…" /></div>;
  return children;
}
