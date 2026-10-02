import OrderTrackingClient from '@/components/ordering/OrderTrackingClient'
export default async function Page({params}:{params:Promise<{token:string}>}){const{token}=await params;return <OrderTrackingClient token={token}/>}
