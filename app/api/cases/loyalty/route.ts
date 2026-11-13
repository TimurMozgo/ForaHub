import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {emptyLoyaltyAccount,loyaltyProgress,type LoyaltyAccount} from '../../../../lib/case-loyalty';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return reply({error:'sign_in_required'},401);
 try{
  // Dedicated accounting namespace; game-save routes cannot write these records.
  const row=await env.DB!.prepare('SELECT snapshot_json FROM turret_saves WHERE player_id=?').bind(`case-loyalty:sites:${user.userId}`).first<{snapshot_json:string}>();
  const account:LoyaltyAccount=row?JSON.parse(row.snapshot_json):emptyLoyaltyAccount();
  return reply({...loyaltyProgress(account),paymentsConnected:false});
 }catch{return reply({error:'unavailable'},503);}
}
