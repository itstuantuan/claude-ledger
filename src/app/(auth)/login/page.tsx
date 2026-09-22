import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StoreLoginForm } from '@/features/auth/login-form';
import { LoadingState } from '@/components/common/error-state';

export const metadata = {
  title: '登录',
  description: '登录 Ledger Console 门店经营管理工作台',
};

export default function LoginPage() {
  if (process.env.NEXT_PUBLIC_API_MODE === 'mock') redirect('/dashboard');
  return (
    <main className="grid min-h-svh place-items-center bg-[#fcfcfb] px-5 py-10 text-[#11110f]">
      <div className="flex w-full flex-col items-center gap-7">
        <Link className="font-serif text-2xl" href="/" aria-label="返回 Ledger Console 首页">
          Ledger Console
        </Link>
        <Suspense fallback={<div className="w-full max-w-[420px]"><LoadingState label="正在加载登录…" /></div>}>
          <StoreLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
