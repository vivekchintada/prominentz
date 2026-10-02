import OnlineOrderingClient from '@/components/ordering/OnlineOrderingClient'
export default async function Page({params}:{params:Promise<{locationId:string}>}){const{locationId}=await params;return <OnlineOrderingClient locationId={locationId}/>}
