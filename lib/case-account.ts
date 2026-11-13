import {CASE_CONFIG,dailyAvailableAt,type OpeningPrize} from '../components/case-opening-prizes';
import type {CaseSale} from './case-sale';
export type CaseReceipt={requestId:string;caseIndex:number;price:number;prize:OpeningPrize;openedAt:number};
export type InventoryItem={prize:OpeningPrize;quantity:number;lastWonAt:number};
export type CaseCredit={id:string;amount:number;at:number;label:string;source:'reward'};
export type CaseAccount={version:1;balance:number;nextAt:number;inventory:Record<string,InventoryItem>;receipts:Record<string,CaseReceipt>;credits?:CaseCredit[];sales?:Record<string,CaseSale>};
export const emptyCaseAccount=(nextAt=0):CaseAccount=>({version:1,balance:0,nextAt,inventory:{},receipts:{}});
export function validateAccount(a:CaseAccount){if(a.version!==1||!Number.isSafeInteger(a.balance)||a.balance<0||!Number.isSafeInteger(a.nextAt)||a.nextAt<0||!a.inventory||!a.receipts)throw Error('invalid_account');return a;}
export function priorOpening(a:CaseAccount,requestId:string,caseIndex:number){const prior=a.receipts[requestId];if(prior&&prior.caseIndex!==caseIndex)throw Error('request_conflict');return prior;}
export function checkOpening(a:CaseAccount,caseIndex:number,now:number){
 validateAccount(a);const config=CASE_CONFIG[caseIndex];if(!config)throw Error('invalid_case');
 if(Object.keys(a.receipts).length>=5000)throw Error('account_capacity');
 if(caseIndex===0&&now<a.nextAt)throw Error('cooldown');
 if(a.balance<config.price)throw Error('insufficient_balance');
}
export function applyOpening(a:CaseAccount,receipt:CaseReceipt):CaseAccount{
 const existing=priorOpening(a,receipt.requestId,receipt.caseIndex);if(existing)return a;
 checkOpening(a,receipt.caseIndex,receipt.openedAt);
 if(receipt.price!==CASE_CONFIG[receipt.caseIndex].price)throw Error('invalid_price');
 const next:CaseAccount={...a,balance:a.balance-receipt.price,inventory:{...a.inventory},receipts:{...a.receipts,[receipt.requestId]:receipt}};
 if(receipt.caseIndex===0)next.nextAt=dailyAvailableAt(receipt.openedAt);
 const p=receipt.prize;
 if(p.kind==='star'){if(!Number.isSafeInteger(p.amount)||p.amount!<=0)throw Error('invalid_prize');next.balance+=p.amount!;}
 else{const old=next.inventory[p.id];next.inventory[p.id]={prize:p,quantity:(old?.quantity??0)+1,lastWonAt:receipt.openedAt};}
 return validateAccount(next);
}
export function accountView(a:CaseAccount,revision:number){return {balance:a.balance,nextAt:a.nextAt,revision,serverNow:Date.now(),credits:a.credits??[],sales:Object.values(a.sales??{}).sort((a,b)=>b.soldAt-a.soldAt).slice(0,20),inventory:Object.values(a.inventory).sort((a,b)=>b.lastWonAt-a.lastWonAt),history:Object.values(a.receipts).sort((a,b)=>b.openedAt-a.openedAt).slice(0,20)};}
export type CaseAccountView=ReturnType<typeof accountView>;
