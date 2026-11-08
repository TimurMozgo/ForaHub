import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { validateState } from "../../../../public/games/dead-route/save-model.mjs";

export const dynamic = "force-dynamic";
type Row = {snapshot_json:string; previous_json:string|null; revision:number; mutation_id:string; updated_at:string};
function reply(body:unknown,status=200) { return Response.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"}}); }
async function identity() {
  const user=await getChatGPTUser(); if(!user) return null;
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`dead-route:${user.userId}`));
  return {id:`dead-route:sites:${user.userId}`,scope:Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("")};
}
function record(row:Row|null) {
  if(!row)return null;
  const state=validateState(JSON.parse(row.snapshot_json)); if(!state)throw new Error("invalid stored checkpoint");
  return {state,revision:row.revision,mutationId:row.mutation_id,updatedAt:row.updated_at};
}
async function read(id:string) { return env.DB!.prepare("SELECT snapshot_json,previous_json,revision,mutation_id,updated_at FROM turret_saves WHERE player_id=?").bind(id).first<Row>(); }
export async function GET() {
  const user=await identity(); if(!user)return reply({error:"sign_in_required"},401);
  try {if(!env.DB)throw new Error("no DB");return reply({scope:user.scope,record:record(await read(user.id)),formatVersion:2,identity:"sites"});}
  catch {return reply({scope:user.scope,error:"cloud_unavailable",identity:"sites"},503);}
}
export async function PUT(request:Request) {
  // State-changing requests must originate from this site, not another webpage.
  if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"invalid_origin"},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"invalid_content_type"},415);
  const user=await identity(); if(!user)return reply({error:"sign_in_required"},401);
  if(Number(request.headers.get("content-length"))>8192)return reply({error:"too_large"},413);
  let input; try {const text=await request.text();if(text.length>8192)return reply({error:"too_large"},413);input=JSON.parse(text);}catch{return reply({error:"invalid_json"},400);}
  if(input.formatVersion!==2)return reply({error:"save_format_mismatch"},426);
  const state=validateState(input.state),revision=input.baseRevision,mutationId=input.mutationId;
  if(!state||!Number.isInteger(revision)||revision<0||revision>2147483646||typeof mutationId!=="string"||!/^[a-zA-Z0-9-]{16,80}$/.test(mutationId))return reply({error:"invalid_save"},400);
  try {
    if(!env.DB)throw new Error("no DB");
    const current=await read(user.id);
    if(current?.mutation_id===mutationId)return reply({scope:user.scope,record:record(current)});
    if((current?.revision||0)!==revision)return reply({error:"conflict",scope:user.scope,record:record(current)},409);
    const now=new Date().toISOString();
    const result=await env.DB.prepare(`INSERT INTO turret_saves(player_id,snapshot_json,previous_json,revision,mutation_id,updated_at)
      VALUES(?,?,NULL,1,?,?) ON CONFLICT(player_id) DO UPDATE SET previous_json=turret_saves.snapshot_json,
      snapshot_json=excluded.snapshot_json,revision=turret_saves.revision+1,mutation_id=excluded.mutation_id,updated_at=excluded.updated_at
      WHERE turret_saves.revision=?`).bind(user.id,JSON.stringify(state),mutationId,now,revision).run();
    const saved=await read(user.id);
    if(!result.meta.changes&&saved?.mutation_id!==mutationId)return reply({error:"conflict",scope:user.scope,record:record(saved)},409);
    // A concurrent write may already have advanced the record; never acknowledge the wrong state.
    if(saved?.mutation_id!==mutationId)return reply({error:"conflict",scope:user.scope,record:record(saved)},409);
    return reply({scope:user.scope,record:record(saved)});
  }catch{return reply({scope:user.scope,error:"cloud_unavailable"},503);}
}

