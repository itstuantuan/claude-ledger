import { OrderDetailPage } from '@/features/orders/order-detail-page';

export const metadata={title:'用料单详情'};

export default async function Page({params}:{params:Promise<{id:string}>}){
  return <OrderDetailPage id={(await params).id}/>;
}
