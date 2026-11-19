import {createHmac, timingSafeEqual} from 'node:crypto';

export type SupportEnv={FORAHUB_BOT_TOKEN?:string;FORAHUB_WEBHOOK_SECRET?:string;FORAHUB_SUPPORT_ENABLED?:string};
const mac=(key:string|Buffer,text:string)=>createHmac('sha256',key).update(text).digest();
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export const validAmount=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=1&&Number(n)<=100000;
export function telegramUser(raw:string,token:string,now=Date.now()){
 const data=new URLSearchParams(raw),hash=data.get('hash')||'';
 if(new Set(data.keys()).size!==[...data.keys()].length)return null;
 data.delete('hash');const check=[...data.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 if(!equal(mac(mac('WebAppData',token),check).toString('hex'),hash))return null;
 const age=now/1000-Number(data.get('auth_date'));if(!Number.isFinite(age)||age< -30||age>3600)return null;
 try{const user=JSON.parse(data.get('user')||'null');return Number.isSafeInteger(user?.id)&&user.id>0?user.id as number:null;}catch{return null;}
}
export function makePayload(user:number,amount:number,token:string,now=Date.now()){
 const body=`support:${user}:${amount}:${Math.floor(now/1000)}`;
 return `${body}:${mac(token,body).toString('base64url')}`;
}
export function validPayload(payload:string,user:number,amount:number,token:string,now=Date.now()){
 const parts=payload.split(':');if(parts.length!==5||parts[0]!=='support'||Number(parts[1])!==user||Number(parts[2])!==amount||!validAmount(amount))return false;
 const age=now/1000-Number(parts[3]);return age>= -30&&age<3600&&equal(mac(token,parts.slice(0,4).join(':')).toString('base64url'),parts[4]);
}
async function telegramCall(token:string,method:string,body:unknown){
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});
 const data=await response.json() as {ok:boolean;result:unknown};if(!response.ok||!data.ok)throw Error('telegram_unavailable');return data.result;
}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function supportInvoice(request:Request,env:SupportEnv){
 if(env.FORAHUB_SUPPORT_ENABLED!=='true'||!env.FORAHUB_BOT_TOKEN||!env.FORAHUB_WEBHOOK_SECRET)return json({error:'not_configured'},503);
 try{
  const raw=await request.text();if(raw.length>16384)return json({error:'invalid_request'},400);
  const body=JSON.parse(raw);if(!validAmount(body.amount)||typeof body.initData!=='string')return json({error:'invalid_request'},400);
  const user=telegramUser(body.initData,env.FORAHUB_BOT_TOKEN);if(!user)return json({error:'invalid_auth'},401);
  const url=await telegramCall(env.FORAHUB_BOT_TOKEN,'createInvoiceLink',{title:'Поддержка TinellGame',description:'Добровольная поддержка разработки. Без игровых наград и зачисления на баланс.',payload:makePayload(user,body.amount,env.FORAHUB_BOT_TOKEN),currency:'XTR',prices:[{label:'Поддержать TinellGame',amount:body.amount}]});
  return json({url});
 }catch{return json({error:'unavailable'},503);}
}
export async function supportWebhook(request:Request,env:SupportEnv){
 if(!env.FORAHUB_BOT_TOKEN||!env.FORAHUB_WEBHOOK_SECRET)return json({error:'not_configured'},503);
 if(!equal(request.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.FORAHUB_WEBHOOK_SECRET))return json({error:'unauthorized'},401);
 try{
  const update=await request.json() as {pre_checkout_query?:{id:string;from:{id:number};currency:string;total_amount:number;invoice_payload:string}};
  const q=update.pre_checkout_query;
  if(q){const ok=env.FORAHUB_SUPPORT_ENABLED==='true'&&q.currency==='XTR'&&validPayload(q.invoice_payload,q.from.id,q.total_amount,env.FORAHUB_BOT_TOKEN);
   await telegramCall(env.FORAHUB_BOT_TOKEN,'answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok,...(!ok?{error_message:'Счёт недействителен. Открой новый счёт в TinellGame.'}:{})});}
  // Support grants no game currency, items or access. Telegram keeps payment records.
  return json({ok:true});
 }catch{return json({error:'retry'},503);}
}
