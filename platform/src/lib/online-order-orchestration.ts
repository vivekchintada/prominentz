import { prisma } from '@/lib/prisma'
import type { KdsStation } from '@prisma/client'

export async function fireOnlineOrder(orderId:string,actorId?:string){
 const existing=await prisma.kdsTicket.count({where:{orderId}});if(existing)return{alreadyFired:true,ticketCount:existing}
 const pending=await prisma.orderItem.findMany({where:{orderId,status:'PENDING'},include:{menuItem:{select:{kdsStation:true,name:true}}}})
 if(!pending.length)throw new Error('No pending items')
 const by=new Map<KdsStation,typeof pending>();for(const item of pending){const s=item.menuItem.kdsStation;if(!by.has(s))by.set(s,[]);by.get(s)!.push(item)}
 const tickets=await prisma.$transaction(async tx=>{const out=[];for(const [station,items] of by){out.push(await tx.kdsTicket.create({data:{orderId,station,status:'NEW',items:{create:items.map(i=>({menuItemId:i.menuItemId,quantity:i.quantity,modifiers:i.modifiers as any,specialNote:i.specialNote,status:'PENDING'}))}}}))}
  const recipes=await tx.recipeItem.findMany({where:{menuItemId:{in:pending.map(i=>i.menuItemId)}}})
  for(const line of pending)for(const r of recipes.filter(x=>x.menuItemId===line.menuItemId)){const qty=r.quantityRequired*line.quantity;await tx.inventoryItem.update({where:{id:r.inventoryItemId},data:{currentStock:{decrement:qty}}});await tx.inventoryTransaction.create({data:{inventoryItemId:r.inventoryItemId,type:'DEPLETION_ORDER',quantity:-qty,orderId,notes:'Online order depletion'}})}
  await tx.orderItem.updateMany({where:{orderId,status:'PENDING'},data:{status:'IN_PROGRESS'}});await tx.order.update({where:{id:orderId},data:{status:'SENT_TO_KITCHEN',onlineStatus:'PREPARING'}});await tx.orderEvent.create({data:{orderId,eventType:'online_order.sent_to_kitchen',actorId:actorId||null,metadata:{ticketCount:out.length}}});return out})
 return{alreadyFired:false,ticketCount:tickets.length}
}
