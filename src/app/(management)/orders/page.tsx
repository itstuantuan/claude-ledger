import { Suspense } from 'react';
import { OrdersPage } from '@/features/orders/orders-page';
import { LoadingState } from '@/components/common/error-state';
export const metadata={title:'用料记录'};
export default function Page(){return <Suspense fallback={<LoadingState/>}><OrdersPage/></Suspense>;}
