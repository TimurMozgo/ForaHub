import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {freshCampaign,chapterOf} from '../public/games/dead-route/save-model.mjs';
async function harness(engine,initial=freshCampaign()){
const noop=()=>{};
const ctx=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();
function el(id){if(elements.has(id))return elements.get(id);const e={id,disabled:false,textContent:'',innerHTML:'',style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,setAttribute:noop,replaceChildren:noop,append:noop,appendChild:noop,querySelector:s=>el(id+s),querySelectorAll:()=>[el(id+'p1'),el(id+'p2')],getContext:()=>ctx,getBoundingClientRect:()=>({width:352,height:700}),width:352,height:700};elements.set(id,e);return e;}
const doc={hidden:false,getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],createElement:()=>el('created'+Math.random()),documentElement:{style:{setProperty:noop}},body:el('body'),addEventListener:noop};
const audioStub=new Proxy({ac:{suspend:noop},effectBuffers:new Proxy({},{get:()=>true}),start:async()=>{},effect:()=>({stop:noop}),mute:noop},{get:(o,k)=>k in o?o[k]:noop});
const c=vm.createContext({console,document:doc,window:{deadChapter:engine,location:{search:''},addEventListener:noop,Telegram:null,deadSessionStorage:{data:{},getItem(k){return this.data[k]},setItem(k,v){this.data[k]=v}}},navigator:{},Image:class{},Audio:class{addEventListener(){} pause(){} play(){return Promise.resolve()}},requestAnimationFrame:noop,setTimeout,clearTimeout,performance:{now:()=>0},getComputedStyle:()=>({getPropertyValue:()=>0}),innerWidth:352,innerHeight:700,devicePixelRatio:1});
const base='public/games/dead-route/';
const html=fs.readFileSync(base+(engine===1?'index.html':'chapter-two.html'),'utf8');
for(const [,file] of html.matchAll(/<script src="([^"?]+)\?/g)){if(file==='hub-adapter.js')continue;let s=fs.readFileSync(base+file,'utf8');if(['game.js','game-first.js'].includes(file))s=s.replace(/\bboot\(\);/,'');vm.runInContext(s,c,{filename:file});}
vm.runInContext('audio.start=async()=>{};audio.ac={suspend(){}};',c);
c.testAudio=audioStub;vm.runInContext('Object.assign(audio,testAudio);audio.play=()=>{};audio.tone=()=>{};music.play=()=>{};music.stop=()=>{};music.pause=()=>{};music.resume=()=>{};',c);

 let api,writes=[];c.testModel={freshCampaign,chapterOf};
 c.stubCreate=async game=>{api=game;game.apply(initial);game.ready();return {write:s=>(writes.push(structuredClone(s)),true),backup:()=>null,archive:()=>true,handoff:async()=>true};};
 c.click=null;doc.addEventListener=(event,fn)=>{if(event==='click')c.click=fn;};
 let adapter=fs.readFileSync(base+'hub-adapter.js','utf8').replace("await import('./save-client.mjs?v=2026.11.09.2')","({createDeadSave:stubCreate})").replace("await import('./save-model.mjs?v=2026.11.09.2')","testModel");
 await vm.runInContext(adapter,c);
 async function start(){c.click({target:{closest:()=>({id:'start'})},preventDefault:noop,stopImmediatePropagation:noop});await new Promise(r=>setTimeout(r,10));}
 return {api,c,start,writes,run:s=>vm.runInContext(s,c)};
}
const h1=await harness(1);await h1.start();assert.equal(h1.api.capture().zone,'c1-1');assert.equal(h1.run('allies.length'),0,'New campaign starts alone');assert.equal(h1.run('player.reserve'),72);
for(let n=2;n<=5;n++){
 h1.run("allies=[{...actor(150,1180,2),name:'МАРК',hp:73}];money=123;player.reserve=101;enterShop();");
 assert.equal(h1.api.capture().zone,'c1-'+n);assert.equal(h1.api.capture().phase,'shop');
 h1.run("buy('ammo')");const point=h1.api.capture();assert.equal(point.kit.money,103);
 h1.api.apply(point);await h1.start();assert.equal(h1.run('state'),'shop');assert.equal(h1.run('money'),103);assert.equal(h1.run('player.reserve'),149);
 h1.run('beginArrival();draw(.016)');assert.equal(h1.api.capture().phase,'entry');
 const entry=h1.api.capture();h1.api.apply(entry);await h1.start();assert.equal(h1.run('stage'),n);assert.equal(h1.run('allies[0].hp'),73);console.log('PASS chapter I location + shop restore:',n);
}
h1.run('showEnding(true)');const boundary=h1.api.capture();assert.equal(boundary.zone,'post');assert.equal(JSON.stringify(boundary.completedChapters),JSON.stringify([1]));
const h2=await harness(2,boundary);await h2.start();assert.equal(h2.run('player.reserve'),boundary.kit.reserve);assert.equal(h2.run('allies[0].hp'),boundary.crew[1].hp);assert.equal(h2.run('allies.length'),boundary.crew.length-1);
for(const [fn,zone] of [['beginServiceSector','service'],['beginCableTunnel','tunnel'],['beginDepotArrival','depot'],['beginChapterTwoEnding','ending']]){
 if(zone==='ending')h2.run('beginDepotDefense()');h2.run(fn+'()');const point=h2.api.capture();assert.equal(point.zone,zone);
 const read=()=>h2.run('JSON.stringify({ammo:player.ammo,reserve:player.reserve,hp:player.hp,grenades:player.grenades,crew:allies.map(a=>({name:a.name,hp:a.hp}))})');const live=read();h2.api.apply(point);await h2.start();assert.equal(read(),live);h2.run('draw(.016)');console.log('PASS chapter II restore:',zone);
}
h2.run('finishChapterTwo()');const third=h2.api.capture();assert.equal(third.zone,'breakdown');assert.equal(JSON.stringify(third.completedChapters),JSON.stringify([1,2]));await h2.start();assert.equal(h2.run('player.reserve'),third.kit.reserve);assert.equal(h2.run('player.grenades'),third.kit.grenades);assert.equal(h2.run('allies.length'),third.crew.length-1);
h2.run("state='c2done';update(0)");const station=h2.api.capture();assert.equal(station.zone,'station');await h2.start();assert.equal(h2.run('chapterTwo.zone'),'station');assert.equal(h2.run('player.reserve'),station.kit.reserve+48);h2.run("state='c2done';update(0)");assert.equal(h2.api.capture().completed,true);assert.equal(JSON.stringify(h2.api.capture().completedChapters),JSON.stringify([1,2,3]));
console.log('PASS sequential I -> II -> III -> station; carried crew/equipment; persisted end of available campaign.');


