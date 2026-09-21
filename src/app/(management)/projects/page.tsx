import { Suspense } from 'react';import { ProjectsPage } from '@/features/customers/list-pages';import { LoadingState } from '@/components/common/error-state';
export const metadata={title:'工地 / 项目'};export default function Page(){return <Suspense fallback={<LoadingState/>}><ProjectsPage/></Suspense>}
