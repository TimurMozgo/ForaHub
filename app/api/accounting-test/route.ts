import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {OWNER_CREDIT_USER} from '../../../lib/case-owner-credit';
import {validateTestOperation} from '../../../lib/accounting-test';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'forbidden'},403);
 const user=await getChatGPTUser();if(!user||user.userId!==OWNER_CREDIT_USER)return reply({error:'owner_only'},403);
 let input;try{const body=await request.json() as {action?:unknown};input=body?.action==='state'?{action:'state'}:validateTestOperation(body);}catch{return reply({error:'invalid_request'},400);}
 const url=env.FORAHUB_TEST_SHEETS_URL,secret=env.FORAHUB_TEST_SHEETS_SECRET;
 if(!url||!secret||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))return reply({error:'not_configured'},503);
 // Only a synthetic sandbox identity leaves the hub; never send email or Telegram data.
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.userId));
 const player='TEST-'+Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);
 const operation={...input,mode:'test',player,nickname:'@hub_test'};
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,operation}),signal:AbortSignal.timeout(25000),redirect:'follow'});
  if(!response.ok)return reply({error:'sync_uncertain'},502);
  const result=await response.json() as {ok:boolean;result?:unknown;error?:string};
  if(!result.ok){const allowed=['insufficient_balance','already_sold','gift_not_owned','request_conflict','invalid_balance','sandbox_capacity'];return reply({error:allowed.includes(result.error||'')?result.error:'sync_uncertain'},409);}
  return reply({ok:true,result:result.result});
 }catch{return reply({error:'sync_uncertain'},502);}
}
