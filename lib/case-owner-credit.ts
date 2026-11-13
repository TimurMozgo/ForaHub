import {validateAccount,type CaseAccount} from './case-account';
// Explicit one-time owner request, 2026-11-13. Internal reward funds, not paid Stars.
// Target is the existing authenticated Sites player ID, not a browser-supplied ID.
export const OWNER_CREDIT_USER='zYjMCWl0I1mIRROvk9jswoE8QZV7ePoIhAcPTwLFsmfItNj2INI6Iy';
export const OWNER_CREDIT_ID='owner-check-20261113-1000-v1';
export function applyOwnerCredit(userId:string,account:CaseAccount,now:number):CaseAccount{
 validateAccount(account);
 if(userId!==OWNER_CREDIT_USER||account.credits?.some(c=>c.id===OWNER_CREDIT_ID))return account;
 return validateAccount({...account,balance:account.balance+1000,credits:[...(account.credits??[]),{id:OWNER_CREDIT_ID,amount:1000,at:now,label:'Бонусное начисление',source:'reward'}]});
}
