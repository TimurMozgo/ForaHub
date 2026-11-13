import {env} from 'cloudflare:workers';
import {CASE_CONFIG,pickOpeningPrize,dailyAvailableAt} from '../components/case-opening-prizes';
import {emptyCaseAccount,validateAccount,priorOpening,checkOpening,applyOpening,accountView,type CaseAccount,type CaseReceipt} from './case-account';
import {applyOwnerCredit,OWNER_CREDIT_ID} from './case-owner-credit';
type Row={snapshot_json:string;revision:number};
const key=(userId:string)=>`case-account:sites:${userId}`;
async function readStoredAccount(userId:string){
 const row=await env.DB!.prepare('SELECT snapshot_json,revision FROM turret_saves WHERE player_id=?').bind(key(userId)).first<Row>();
 if(row)return {account:validateAccount(JSON.parse(row.snapshot_json) as CaseAccount),revision:row.revision};
 // Preserve the existing daily cooldown; historical visual-only results are not minted.
 const legacy=await env.DB!.prepare('SELECT snapshot_json,revision FROM turret_saves WHERE player_id=?').bind(`case-daily:sites:${userId}`).first<Row>();
 const openedAt=legacy?(JSON.parse(legacy.snapshot_json) as {openedAt:number}).openedAt:0;
 return {account:emptyCaseAccount(openedAt?dailyAvailableAt(openedAt):0),revision:0};
}
export async function readCaseAccount(userId:string){
 for(let attempt=0;attempt<8;attempt++){
  const current=await readStoredAccount(userId),now=Date.now();
  const next=applyOwnerCredit(userId,current.account,now);if(next===current.account)return current;
  const result=await env.DB!.prepare(`INSERT INTO turret_saves(player_id,snapshot_json,previous_json,revision,mutation_id,updated_at) VALUES(?,?,NULL,1,?,?) ON CONFLICT(player_id) DO UPDATE SET snapshot_json=excluded.snapshot_json,revision=turret_saves.revision+1,mutation_id=excluded.mutation_id,updated_at=excluded.updated_at WHERE turret_saves.revision=?`).bind(key(userId),JSON.stringify(next),OWNER_CREDIT_ID,new Date(now).toISOString(),current.revision).run();
  if(result.meta.changes)return {account:next,revision:current.revision+1};
 }
 throw Error('retry');
}
export async function settleCaseOpening(userId:string,caseIndex:number,requestId:string){
 for(let attempt=0;attempt<8;attempt++){
  const {account,revision}=await readCaseAccount(userId),prior=priorOpening(account,requestId,caseIndex);
  if(prior)return {receipt:prior,account:accountView(account,revision)};
  const now=Date.now();checkOpening(account,caseIndex,now);
  const receipt:CaseReceipt={requestId,caseIndex,price:CASE_CONFIG[caseIndex].price,prize:pickOpeningPrize(caseIndex),openedAt:now};
  const next=applyOpening(account,receipt);
  // One CAS updates debit, credit/inventory, cooldown and durable receipt together.
  const result=await env.DB!.prepare(`INSERT INTO turret_saves(player_id,snapshot_json,previous_json,revision,mutation_id,updated_at) VALUES(?,?,NULL,1,?,?) ON CONFLICT(player_id) DO UPDATE SET snapshot_json=excluded.snapshot_json,revision=turret_saves.revision+1,mutation_id=excluded.mutation_id,updated_at=excluded.updated_at WHERE turret_saves.revision=?`).bind(key(userId),JSON.stringify(next),requestId,new Date(now).toISOString(),revision).run();
  if(result.meta.changes)return {receipt,account:accountView(next,revision+1)};
 }
 throw Error('retry');
}
