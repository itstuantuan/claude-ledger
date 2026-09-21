import { Suspense } from 'react';
import { MaterialsPage } from '@/features/materials/materials-page';
import { LoadingState } from '@/components/common/error-state';
export const metadata={title:'材料'};
export default function Page(){return <Suspense fallback={<LoadingState/>}><MaterialsPage/></Suspense>;}
