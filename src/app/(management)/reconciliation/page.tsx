import { Suspense } from 'react';
import { ReconciliationPage } from '@/features/ledger/ledger-pages';
import { LoadingState } from '@/components/common/error-state';
export const metadata = { title: '客户对账' };
export default function Page() { return <Suspense fallback={<LoadingState label="正在加载对账页面…"/>}><ReconciliationPage/></Suspense>; }
