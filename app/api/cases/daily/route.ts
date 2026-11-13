import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {pickOpeningPrize,dailyAvailableAt,type OpeningPrize} from '../../../../components/case-opening-prizes';
export const dynamic='force-dynamic';
type State={openedAt:number;requestId:string;prize:OpeningPrize};
type Row={snapshot_json:string;revision:number};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
async function identity(){const user=await getChatGPTUser();return user?`case-daily:sites:${user.userId}`:null;}
async function read(id:string){return env.DB!.prepare('SELECT snapshot_json,revision FROM turret_saves WHERE player_id=?').bind(id).first<Row>();}
function parse(row:Row|null):State|null{return row?JSON.parse(row.snapshot_json):null;}
export async function GET(){const id=await identity();if(!id)return reply({error:'sign_in_required'},401);try{const s=parse(await read(id));return reply({nextAt:s?dailyAvailableAt(s.openedAt):0,serverNow:Date.now()});}catch{return reply({error:'unavailable'},503);}}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'invalid_origin'},403);
 const id=await identity();if(!id)return reply({error:'sign_in_required'},401);
 let requestId:string;try{const b=await request.json() as {requestId?:unknown};if(typeof b.requestId!=='string')throw Error();requestId=b.requestId;if(typeof requestId!=='string'||!/^[a-f0-9-]{36}$/.test(requestId))throw Error();}catch{return reply({error:'invalid_request'},400);}
 try{for(let attempt=0;attempt<5;attempt++){
  const row=await read(id),previous=parse(row),now=Date.now();
  if(previous?.requestId===requestId)return reply({prize:previous.prize,nextAt:dailyAvailableAt(previous.openedAt),serverNow:now});
  if(previous&&now<dailyAvailableAt(previous.openedAt))return reply({error:'cooldown',nextAt:dailyAvailableAt(previous.openedAt),serverNow:now},409);
  const prize=pickOpeningPrize(0),state:State={openedAt:now,requestId,prize};
  const result=await env.DB!.prepare(`INSERT INTO turret_saves(player_id,snapshot_json,previous_json,revision,mutation_id,updated_at) VALUES(?,?,NULL,1,?,?) ON CONFLICT(player_id) DO UPDATE SET snapshot_json=excluded.snapshot_json,revision=turret_saves.revision+1,mutation_id=excluded.mutation_id,updated_at=excluded.updated_at WHERE turret_saves.revision=?`).bind(id,JSON.stringify(state),requestId,new Date(now).toISOString(),row?.revision??0).run();
  if(result.meta.changes)return reply({prize,nextAt:dailyAvailableAt(now),serverNow:now});
 }return reply({error:'retry'},409);}catch{return reply({error:'unavailable'},503);}
}
