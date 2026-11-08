import assert from 'node:assert/strict';
import {createForgeSave} from '../public/games/turret-forge/save-client.mjs';
const fresh=()=>({coins:180,hp:100,wave:1,best:1,slots:[1,1,0,0,0,0,0,0,0,0,0,0],sound:true});
const memory=new Map();let remote=null,failAfterCommit=false,gameState,ready=false,statuses=[],listeners={},gate;
function element(){return {children:[],hidden:true,append(...v){this.children.push(...v);},replaceChildren(){this.children=[];},textContent:''};}
globalThis.location={origin:'https://hub.test',reload(){throw new Error('unexpected reload');}};
globalThis.parent={postMessage(m){statuses.push(m);}};
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
globalThis.window={addEventListener:(key,fn)=>{listeners[key]=fn;}};
globalThis.document={createElement:element,getElementById:()=>element(),addEventListener(){},body:{append(el){gate=el;}}};
globalThis.fetch=async(_url,opts)=>{
 if(opts.method==='GET')return Response.json({scope:'test-player',record:remote,formatVersion:2});
 const body=JSON.parse(opts.body);assert.equal(body.formatVersion,2);
 if((remote?.revision||0)!==body.baseRevision)return Response.json({scope:'test-player',record:remote,error:'conflict'},{status:409});
 remote={state:structuredClone(body.state),revision:(remote?.revision||0)+1,mutationId:body.mutationId,updatedAt:new Date().toISOString()};
 if(failAfterCommit){failAfterCommit=false;throw new Error('response lost');}
 return Response.json({scope:'test-player',record:remote});
};
const game={fresh,capture:()=>gameState,pause(){},apply:s=>{gameState=s;},ready(){ready=true;}};
let store=await createForgeSave(game);assert.equal(ready,true);
gameState.coins-=50;gameState.slots[2]=1;store.write(gameState);await store.flush();
assert.equal(remote.state.coins,130,'Mutation must not alias comparison snapshot');assert.equal(remote.state.slots[2],1);
assert.equal(JSON.parse(memory.get('gamehub:turret-forge:v2:test-player')).state.coins,130);
await listeners.message({origin:location.origin,source:parent,data:{type:'forge:exit'}});
ready=false;store=await createForgeSave(game);assert.equal(gameState.coins,130,'Reopening must restore purchased turret');assert.equal(gameState.slots[2],1);
// Server committed the state, but the HTTP response was lost. A newer local change must survive.
gameState.coins=100;store.write(gameState);failAfterCommit=true;await store.flush();assert.equal(remote.state.coins,100);
gameState.coins=80;store.write(gameState);await store.flush();assert.equal(remote.state.coins,80);assert.equal(remote.revision,3);
// An independently advanced remote cannot silently overwrite a pending local branch.
gameState.coins=60;store.write(gameState);remote={...remote,revision:4,mutationId:'another-device-operation',state:{...fresh(),coins:999}};
await store.flush();assert.equal(remote.state.coins,999);assert.equal(gameState.coins,60);assert.equal(gate.hidden,false);assert.ok(statuses.some(s=>s.kind==='conflict'));
assert.equal(JSON.parse(memory.get('gamehub:turret-forge:v2:test-player:recovery')).state.coins,60);
await listeners.message({origin:location.origin,source:parent,data:{type:'forge:exit'}});
console.log('PASS: live state isolation, local writes, reopen restoration, lost acknowledgement + newer offline change, non-destructive conflict and recovery copy.');
