import assert from 'node:assert/strict';import {build} from 'esbuild';
let user={userId:'alice'},now=1000000000,failWrites=false;const rows=new Map(),originalNow=Date.now;Date.now=()=>now;
globalThis.__accountUser=()=>user;
globalThis.__accountDb={prepare:()=>({bind:(...args)=>({first:async()=>rows.has(args[0])?{...rows.get(args[0])}:null,run:async()=>{if(failWrites)throw Error('db offline');const [key,json,, ,revision]=args,old=rows.get(key);if((old?.revision??0)!==revision)return {meta:{changes:0}};rows.set(key,{snapshot_json:json,revision:revision+1});return {meta:{changes:1}};}})})};
const plugins=[{name:'bindings',setup(b){b.onResolve({filter:/^(cloudflare:workers)$|chatgpt-auth$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='cloudflare:workers'?'export const env={DB:globalThis.__accountDb};':'export const getChatGPTUser=async()=>globalThis.__accountUser();',loader:'js'}));}}];
async function compile(path){const b=await build({entryPoints:[new URL(path,import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm',platform:'node',plugins});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].contents).toString('base64'));}
const {POST}=await compile('../../app/api/cases/open/route.ts'),{GET}=await compile('../../app/api/cases/account/route.ts');
const {emptyCaseAccount,applyOpening}=await compile('../../lib/case-account.ts');
const {getOpeningPrizes}=await compile('../../components/case-opening-prizes.ts');
const request=(caseIndex,requestId=crypto.randomUUID(),extras={})=>new Request('https://hub.example/api/cases/open',{method:'POST',headers:{origin:'https://hub.example','Content-Type':'application/json'},body:JSON.stringify({requestId,caseIndex,...extras})});
const key='case-account:sites:alice',state=()=>JSON.parse(rows.get(key).snapshot_json);
assert.equal((await (await GET()).json()).balance,0);
const id=crypto.randomUUID();const responses=await Promise.all(Array.from({length:8},()=>POST(request(0,id))));assert(responses.every(r=>r.status===200));const first=await responses[0].json();assert.equal(Object.keys(state().receipts).length,1);
assert.equal(state().balance,first.prize.kind==='star'?first.prize.amount:0);
const before=rows.get(key).snapshot_json;await POST(request(0,id));assert.equal(rows.get(key).snapshot_json,before);
assert.equal((await POST(request(0))).status,409);assert.equal((await POST(request(1,id))).status,409);
now+=86400000-1;assert.equal((await POST(request(0))).status,409);now++;assert.equal((await POST(request(0))).status,200);
const after=rows.get(key).snapshot_json;await POST(request(0,id));assert.equal(rows.get(key).snapshot_json,after);
// Race multiple paid debits against a balance sufficient for exactly one opening.
rows.set(key,{snapshot_json:JSON.stringify({...emptyCaseAccount(),balance:10}),revision:1});
const ids=Array.from({length:8},()=>crypto.randomUUID());const paid=await Promise.all(ids.map(id=>POST(request(1,id,{prizeId:'redo',amount:999999}))));assert.equal(paid.filter(r=>r.status===200).length,1);assert.equal(Object.keys(state().receipts).length,1);assert(state().balance>=0&&state().balance<=5);
const winner=paid.findIndex(r=>r.status===200),settled=rows.get(key).snapshot_json;await POST(request(1,ids[winner]));assert.equal(rows.get(key).snapshot_json,settled);
// Test every prize type, quantity aggregation and duplicate delivery deterministically.
for(const kind of ['star','gift','gem']){let a={...emptyCaseAccount(),balance:200};const prize=getOpeningPrizes(4).find(p=>p.kind===kind);const receipt={requestId:crypto.randomUUID(),caseIndex:4,price:100,prize,openedAt:now};a=applyOpening(a,receipt);assert.equal(a.balance,100+(kind==='star'?prize.amount:0));if(kind!=='star')assert.equal(a.inventory[prize.id].quantity,1);assert.strictEqual(applyOpening(a,receipt),a);a=applyOpening(a,{...receipt,requestId:crypto.randomUUID()});if(kind!=='star')assert.equal(a.inventory[prize.id].quantity,2);}
// User isolation, failure atomicity, old cooldown migration, auth/origin validation.
user={userId:'bob'};assert.equal((await (await GET()).json()).balance,0);failWrites=true;assert.equal((await POST(request(0))).status,503);assert(!rows.has('case-account:sites:bob'));failWrites=false;
rows.set('case-daily:sites:bob',{snapshot_json:JSON.stringify({openedAt:now}),revision:1});assert.equal((await POST(request(0))).status,409);assert.equal((await (await GET()).json()).nextAt,now+86400000);
assert.equal((await POST(request(7))).status,400);assert.equal((await POST(new Request('https://hub.example/api/cases/open',{method:'POST',headers:{origin:'https://evil.example'}}))).status,403);
user=null;assert.equal((await GET()).status,401);assert.equal((await POST(request(0))).status,401);Date.now=originalNow;
console.log('PASS: atomic debit+award, every prize type, duplicate/retry safety, paid races, daily boundaries/migration, persistence, auth and user isolation.');
