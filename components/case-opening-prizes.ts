import {getCasePrizes,type CaseId,type Prize} from './case-prizes';
export const CASE_ORDER:CaseId[]=['spark','pulse','legend'];
// Visual selection only; does not debit a balance or award transferable assets.
export function getOpeningPrizes(index:number):Prize[]{
 const id=CASE_ORDER[index];if(!id)throw new Error('Unknown case');
 return [...getCasePrizes(id),...[1,2,5].map(amount=>({kind:'star' as const,amount,label:`${amount} ${amount===1?'звезда':amount===2?'звезды':'звёзд'}`}))];
}
export function pickOpeningPrize(index:number,random=Math.random):Prize{
 const pool=getOpeningPrizes(index),value=random();
 if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Invalid random value');
 return pool[Math.floor(value*pool.length)];
}
