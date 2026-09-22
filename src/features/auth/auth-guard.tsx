'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi, isMock } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/errors';
import { ErrorState, LoadingState } from '@/components/common/error-state';
export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, error, fail, clear } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const autoLoginStarted = useRef(false);
  useEffect(() => {
    if (status === 'authenticated') { autoLoginStarted.current = false; return; }
    if (status !== 'anonymous') return;
    if (!isMock) { router.replace(`/login?next=${encodeURIComponent(pathname)}`); return; }
    if (autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    void authApi.login({ account: 'owner', password: 'Paint123!' })
      .catch((cause) => fail(errorMessage(cause)))
      .finally(() => { autoLoginStarted.current = false; });
  }, [status, pathname, router, fail]);
  if (status === 'error') return <div className="grid min-h-svh place-items-center bg-[#fcfcfb]"><ErrorState error={new Error(error ?? '会话恢复失败')} retry={() => { if (isMock) { autoLoginStarted.current=false; clear(); } else void authApi.restore(); }} /></div>;
  if (status !== 'authenticated') return <div className="grid min-h-svh place-items-center bg-[#fcfcfb]"><LoadingState label="正在确认登录状态…" /></div>;
  return children;
}
