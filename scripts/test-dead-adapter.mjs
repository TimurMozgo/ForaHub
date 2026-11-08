import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const noop=()=>{};
const ctx=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();
function el(id){if(elements.has(id))return elements.get(id);const e={id,disabled:false,textContent:'',innerHTML:'',style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,setAttribute:noop,append:noop,appendChild:noop,querySelector:s=>el(id+s),querySelectorAll:()=>[el(id+'p1'),el(id+'p2')],getContext:()=>ctx,getBoundingClientRect:()=>({width:352,height:700}),width:352,height:700};elements.set(id,e);return e;}
const doc={hidden:false,getElementById:el,querySelectorAll:()=>[],createElement:()=>el('created'+Math.random()),documentElement:{style:{setProperty:noop}},body:el('body'),addEventListener:noop};
const audioStub=new Proxy({ac:{suspend:noop},effectBuffers:new Proxy({},{get:()=>true}),start:async()=>{},effect:()=>({stop:noop}),mute:noop},{get:(o,k)=>k in o?o[k]:noop});
const c=vm.createContext({console,document:doc,window:{location:{search:''},addEventListener:noop,Telegram:null,deadSessionStorage:{data:{},getItem(k){return this.data[k]},setItem(k,v){this.data[k]=v}}},navigator:{},Image:class{},Audio:class{addEventListener(){} pause(){} play(){return Promise.resolve()}},requestAnimationFrame:noop,setTimeout,clearTimeout,performance:{now:()=>0},getComputedStyle:()=>({getPropertyValue:()=>0}),innerWidth:352,innerHeight:700,devicePixelRatio:1});
const base='public/games/dead-route/';
const html=fs.readFileSync(base+'index.html','utf8');
for(const [,file] of html.matchAll(/<script src="([^"?]+)\?/g)){if(file==='hub-adapter.js')continue;let s=fs.readFileSync(base+file,'utf8');if(file==='game.js')s=s.replace(/\bboot\(\);/,'');vm.runInContext(s,c,{filename:file});}
vm.runInContext('audio.start=async()=>{};audio.ac={suspend(){}};',c);
c.testAudio=audioStub;vm.runInContext('Object.assign(audio,testAudio);music.play=()=>{};music.stop=()=>{};music.pause=()=>{};music.resume=()=>{};',c);
let api,writes=[];c.stubCreate=async game=>{api=game;game.apply(game.fresh());game.ready();return {write:s=>writes.push(structuredClone(s))};};
c.click=null;doc.addEventListener=(event,fn)=>{if(event==='click')c.click=fn;};
let adapter=fs.readFileSync(base+'hub-adapter.js','utf8').replace("await import('./save-client.mjs?v=2026.11.09.1')","({createDeadSave:stubCreate})");
// Await the actual adapter initialization; no game source behavior is replaced.
await vm.runInContext(adapter,c);
async function start(){c.click({target:{closest:()=>({id:'start'})},preventDefault:noop,stopImmediatePropagation:noop});await new Promise(r=>setTimeout(r,10));}
await start();assert.equal(api.capture().zone,'post');assert.equal(api.capture().started,true);
for(const [fn,zone] of [['beginServiceSector','service'],['beginCableTunnel','tunnel'],['beginDepotArrival','depot'],['beginChapterTwoEnding','ending'],['beginTruckBreakdown','breakdown'],['beginStation','station']]){
 if(zone==='ending')vm.runInContext('beginDepotDefense()',c);
 vm.runInContext(fn+'()',c);
 const saved=api.capture();assert.equal(saved.zone,zone); const actual=vm.runInContext('JSON.stringify({ammo:player.ammo,reserve:player.reserve,hp:player.hp,grenades:player.grenades,crew:allies.map(a=>({name:a.name,hp:a.hp}))})',c);
 api.apply(saved);await start();
 assert.equal(vm.runInContext('JSON.stringify({ammo:player.ammo,reserve:player.reserve,hp:player.hp,grenades:player.grenades,crew:allies.map(a=>({name:a.name,hp:a.hp}))})',c),actual,'Restored live equipment and crew must match original entry');assert.equal(api.capture().zone,zone);assert.deepEqual(api.capture().kit,saved.kit,'Checkpoint inventory must not accumulate entry bonuses');
 vm.runInContext('draw(0.016)',c);
 console.log('PASS restore + draw:',zone);
}
console.log('PASS actual chapter scripts: checkpoint transitions, restoration, rendering, inventory consistency.');



