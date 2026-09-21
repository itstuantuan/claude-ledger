import { Suspense } from 'react';import { TeamsPage } from '@/features/customers/list-pages';import { LoadingState } from '@/components/common/error-state';
export const metadata={title:'施工队'};export default function Page(){return <Suspense fallback={<LoadingState/>}><TeamsPage/></Suspense>}
