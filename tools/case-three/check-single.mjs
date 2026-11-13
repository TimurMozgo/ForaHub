import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {gsap} from 'gsap';import {createChest} from './model.mjs';
const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('function reset('),src.indexOf('function resize('));
for(const gentle of [false,true])for(let soloIndex=0;soloIndex<5;soloIndex++){
 const boxes=Array.from({length:5},()=>{const object=createChest(),materials=new Set();object.traverse(o=>{if(o.material)materials.add(o.material)});const parts=Object.fromEntries(['front','back','left','right','lid','base','core'].map(n=>[n,object.getObjectByName(n)]));return {object,materials,parts,glows:new Set(),homes:new Map(Object.values(parts).map(p=>[p,{position:p.position.clone(),rotation:p.rotation.clone()}]))};});
 const nodes={}, $=s=>nodes[s]??(nodes[s]={checked:gentle,hidden:false});const reward=new T.Group(),camera=new T.PerspectiveCamera();
 const factory=new Function('soloIndex','gsap','boxes','reward','camera','fx','bloom','$','variants','light','particleMat','document',`const openingCaseIndex=null;const setBackdrop=()=>{};const preparePrize=()=>{};const tellHub=()=>{};let state='idle',timeline=null,selected=soloIndex,chest=boxes[selected].object,parts=boxes[selected].parts,glowMaterials;function resize(){}${code};return {reset,open,get timeline(){return timeline}};`);
 const c=factory(soloIndex,gsap,boxes,reward,camera,{energy:0,burst:0},{strength:.3},$,Array.from({length:5},()=>({name:'test',color:0x00ffff})),{color:new T.Color()},{color:new T.Color()},{querySelectorAll:()=>[]});
 const assertSolo=()=>{assert.deepEqual(boxes.map(b=>b.object.visible),boxes.map((_,i)=>i===soloIndex));assert.equal(boxes[soloIndex].object.position.x,0);assert.equal($('#choices').hidden,true);};
 c.reset();assertSolo();assert.equal(boxes[soloIndex].object.scale.x,1);
 c.open((soloIndex+1)%5);c.timeline.pause();assertSolo();
 c.timeline.seek(1,true);assert(boxes[soloIndex].object.rotation.y>.15);c.timeline.seek(3.9,true);assert(Math.abs(boxes[soloIndex].object.rotation.y-(.15+Math.PI*8))<1e-5);assert.equal(boxes[soloIndex].parts.lid.position.y,.71);
 c.timeline.seek(c.timeline.duration(),false);assert.equal(reward.visible,true);assert.equal(boxes[soloIndex].object.visible,false);boxes.forEach(b=>assert.equal(b.object.visible,false));
 c.open();c.timeline.pause();assertSolo();c.timeline.kill();c.reset();assertSolo();
}
gsap.ticker.sleep();console.log('PASS: each card shows only its selected chest before first frame, during opening, on replay and reset.');
