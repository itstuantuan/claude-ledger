import { Suspense } from 'react';
import { Header } from '@/components/header';
import { DotField } from '@/components/dot-field';
import { CompanyLogos } from '@/components/company-logos';
import { StoreLoginForm } from '@/features/auth/login-form';
import { LoadingState } from '@/components/common/error-state';

export const metadata = {
  title: 'Ledger Console',
  description: 'Ledger Console',
};

export default function Home() {
  return <div className="min-h-svh bg-[#fcfcfb] text-[#11110f]">
    <Header />
    <main>
      <section className="relative isolate flex min-h-[730px] items-center justify-center overflow-hidden px-6 py-8 max-[767px]:min-h-[calc(100svh-72px)] max-[767px]:py-10">
        <DotField />
        <div className="flex w-full flex-col items-center gap-10">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-medium leading-[1.11] tracking-[-.9px] max-[767px]:text-[32px]">Build on the<br />Claude Platform</h1>
            <p className="mt-3 text-sm leading-5 text-[#52514e]">Create agents and applications with frontier<br className="max-[500px]:hidden" /> Claude models and managed agent infrastructure.</p>
          </div>
          <Suspense fallback={<div className="w-full max-w-md rounded-[32px] border border-[#dededb] bg-[#fcfcfb] shadow-[0_12px_22px_-8px_#00000024,0_2px_8px_#00000008]"><LoadingState label="Loading…" /></div>}>
            <StoreLoginForm compact />
          </Suspense>
        </div>
      </section>
      <CompanyLogos />
    </main>
  </div>;
}
