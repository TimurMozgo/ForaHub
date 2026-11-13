// Server-owned accounting only. Never accept these records from a browser or game save.
export const LOYALTY_TARGET=2500;
export const LOYALTY_NFT_MAX_COST=500;
export type SettledCaseOrder={
 orderId:string;casePrice:number;paidStars:number;rewardStars:number;
 refundedPaidStars:number;status:'settled'|'pending'|'cancelled';
};
export type BonusAward={assetId:string;label:string;costStars:number;kind:'gem'};
export type LoyaltyAccount={version:1;orders:SettledCaseOrder[];bonus:BonusAward|null};
export function emptyLoyaltyAccount():LoyaltyAccount{return {version:1,orders:[],bonus:null};}
function integer(n:number){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid Stars amount');}
export function loyaltyProgress(account:LoyaltyAccount){
 if(account.version!==1||!Array.isArray(account.orders))throw Error('Invalid loyalty account');
 const seen=new Set<string>();let paidSpent=0;
 for(const o of account.orders){
  if(!o.orderId||seen.has(o.orderId))throw Error('Duplicate order');seen.add(o.orderId);
  for(const n of [o.casePrice,o.paidStars,o.rewardStars,o.refundedPaidStars])integer(n);
  if(o.paidStars+o.rewardStars!==o.casePrice||o.refundedPaidStars>o.paidStars||!['settled','pending','cancelled'].includes(o.status))throw Error('Invalid order');
  if(o.status==='settled')paidSpent+=o.paidStars-o.refundedPaidStars;
 }
 integer(paidSpent);
 if(account.bonus&&(!account.bonus.assetId||account.bonus.kind!=='gem'||!Number.isSafeInteger(account.bonus.costStars)||account.bonus.costStars<=0||account.bonus.costStars>LOYALTY_NFT_MAX_COST))throw Error('Invalid NFT award');
 return {paidSpent,target:LOYALTY_TARGET,maxCost:LOYALTY_NFT_MAX_COST,progress:Math.min(paidSpent,LOYALTY_TARGET),remaining:Math.max(0,LOYALTY_TARGET-paidSpent),status:account.bonus?'awarded':paidSpent>=LOYALTY_TARGET?'earned':'collecting',award:account.bonus} as const;
}
// Called only by a future verified payment settlement service, in the SAME
// transaction as the wallet debit. Retry with the same order cannot increment twice.
export function recordSettledOrder(account:LoyaltyAccount,order:SettledCaseOrder):LoyaltyAccount{
 loyaltyProgress(account);if(order.status!=='settled')throw Error('Order is not settled');
 const previous=account.orders.find(o=>o.orderId===order.orderId);
 if(previous){if(JSON.stringify(previous)!==JSON.stringify(order))throw Error('Conflicting order');return account;}
 const next={...account,orders:[...account.orders,order]};loyaltyProgress(next);return next;
}
// One bonus per account. Caller must atomically reserve an OWNED asset in global
// stock, place it in the player's inventory and persist this account together.
// No public issuance endpoint exists until that stock/settlement service is connected.
export function awardLoyaltyNFT(account:LoyaltyAccount,nft:BonusAward):LoyaltyAccount{
 const progress=loyaltyProgress(account);
 if(account.bonus){if(account.bonus.assetId!==nft.assetId)throw Error('Bonus already awarded');return account;}
 if(progress.status!=='earned')throw Error('Threshold not reached');
 const next={...account,bonus:nft};loyaltyProgress(next);return next;
}
