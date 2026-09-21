import { WorkerDetail } from '@/features/customers/detail-pages';
export const metadata={title:'油漆工详情'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <WorkerDetail id={(await params).id}/>}
