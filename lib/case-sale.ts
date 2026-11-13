import {validateAccount,type CaseAccount} from './case-account';
export type CaseSale={requestId:string;openingId:string;prizeId:string;label:string;amount:number;soldAt:number};
export function applySale(a:CaseAccount,requestId:string,prizeId:string,openingId:string|undefined,now:number):{account:CaseAccount;sale:CaseSale}{
 validateAccount(a);const prior=a.sales?.[requestId];
 if(prior){if(prior.prizeId!==prizeId||(openingId&&prior.openingId!==openingId))throw Error('request_conflict');return {account:a,sale:prior};}
 if(Object.keys(a.sales??{}).length>=5000)throw Error('account_capacity');
 const sold=new Set(Object.values(a.sales??{}).map(s=>s.openingId));
 const receipt=openingId?a.receipts[openingId]:Object.values(a.receipts).find(r=>r.prize.id===prizeId&&!sold.has(r.requestId));
 if(!receipt||receipt.prize.id!==prizeId||receipt.prize.kind==='star')throw Error('gift_unavailable');
 if(sold.has(receipt.requestId))throw Error('already_sold');
 const item=a.inventory[prizeId];if(!item||item.quantity<1)throw Error('gift_unavailable');
 // Use the server-persisted value from the award; the client never supplies a price.
 const amount=receipt.prize.costStars;if(!Number.isSafeInteger(amount)||amount<=0)throw Error('invalid_price');
 const sale:CaseSale={requestId,openingId:receipt.requestId,prizeId,label:receipt.prize.label,amount,soldAt:now};
 const inventory={...a.inventory};if(item.quantity===1)delete inventory[prizeId];else inventory[prizeId]={...item,quantity:item.quantity-1};
 const next=validateAccount({...a,balance:a.balance+amount,inventory,sales:{...a.sales,[requestId]:sale}});
 return {account:next,sale};
}
