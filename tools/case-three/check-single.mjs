import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {gsap} from 'gsap';import {createChest} from './model.mjs';
const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('function reset('),src.indexOf('function resize('));
for(let soloIndex=0;soloIndex<3;soloIndex++){
 const boxes=Array.from({length:3},()=>{const object=createChest(),materials=new Set();object.traverse(o=>{if(o.material)materials.add(o.material)});const parts=Object.fromEntries(['front','back','left','right','lid','base','core'].map(n=>[n,object.getObjectByName(n)]));return {object,materials,parts,glows:new Set(),homes:new Map(Object.values(parts).map(p=>[p,{position:p.position.clone(),rotation:p.rotation.clone()}]))};});
 const nodes={}, $=s=>nodes[s]??(nodes[s]={checked:false,hidden:false});const reward=new T.Group(),camera=new T.PerspectiveCamera();
 const factory=new Function('soloIndex','gsap','boxes','reward','camera','fx','bloom','$','variants','light','particleMat','document',`const tellHub=()=>{};let state='idle',timeline=null,selected=soloIndex,chest=boxes[selected].object,parts=boxes[selected].parts,glowMaterials;function resize(){}${code};return {reset,open,get timeline(){return timeline}};`);
 const c=factory(soloIndex,gsap,boxes,reward,camera,{energy:0,burst:0},{strength:.3},$,Array.from({length:3},()=>({name:'test',color:0x00ffff})),{color:new T.Color()},{color:new T.Color()},{querySelectorAll:()=>[]});
 const assertSolo=()=>{assert.deepEqual(boxes.map(b=>b.object.visible),boxes.map((_,i)=>i===soloIndex));assert.equal(boxes[soloIndex].object.position.x,0);assert.equal($('#choices').hidden,true);};
 c.reset();assertSolo();assert.equal(boxes[soloIndex].object.scale.x,1);
 c.open((soloIndex+1)%3);c.timeline.pause();assertSolo();
 c.timeline.seek(3.9,true);assert.equal(boxes[soloIndex].parts.lid.position.y,.71);
 c.timeline.seek(c.timeline.duration(),false);assert.equal(reward.visible,true);assertSolo();
 c.open();c.timeline.pause();assertSolo();c.timeline.kill();c.reset();assertSolo();
}
gsap.ticker.sleep();console.log('PASS: each card shows only its selected chest before first frame, during opening, on replay and reset.');
