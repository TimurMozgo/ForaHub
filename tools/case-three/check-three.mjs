import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {gsap} from 'gsap';import {createChest} from './model.mjs';
const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');const code=src.slice(src.indexOf('function open('),src.indexOf('function resize('));
for(let index=0;index<3;index++){
const boxes=Array.from({length:3},(_,i)=>{const object=createChest();object.position.set((i-1)*2.15,-.35,0);object.scale.setScalar(.6);const materials=new Set();object.traverse(o=>{if(o.material)materials.add(o.material)});return {object,materials,glows:new Set(),parts:Object.fromEntries(['front','back','left','right','lid','base','core'].map(n=>[n,object.getObjectByName(n)]))};});
const reward=new T.Group(),camera=new T.PerspectiveCamera(38,1,.1,60),nodes={};camera.position.set(0,3,9);const $=s=>nodes[s]??(nodes[s]={checked:false,textContent:'',hidden:false,disabled:false});
const factory=new Function('gsap','boxes','reward','camera','fx','bloom','$','variants','light','particleMat','document',`const tellHub=()=>{};const soloIndex=null;let state='idle',timeline,selected=1,chest=boxes[1].object,parts=boxes[1].parts,glowMaterials;function reset(){}${code};return {open,get timeline(){return timeline;}};`);
const c=factory(gsap,boxes,reward,camera,{energy:0,burst:0},{strength:.3},$,Array.from({length:3},()=>({name:'test',color:0x00ffff})),{color:new T.Color()},{color:new T.Color()},{querySelectorAll:()=>[]});
c.open(index);const tl=c.timeline;tl.pause();c.open((index+1)%3);assert.equal(c.timeline,tl);
tl.seek(1.1,true);assert.equal(boxes[index].object.position.x,0);assert.equal(boxes[index].object.scale.x,1);boxes.forEach((b,i)=>{if(i!==index)assert.equal(b.object.visible,false)});
tl.seek(5.1,true);assert(Math.abs(boxes[index].object.rotation.y-Math.PI*8)<1e-6);assert.equal(boxes[index].parts.lid.position.y,.71);
tl.seek(tl.duration(),false);assert.equal(reward.visible,true);assert.equal(reward.scale.x,1);assert.equal($('#open').disabled,false);tl.kill();
}
gsap.ticker.sleep();console.log('PASS: all three choices, peer hiding, centering, lock, stop-before-open and reward.');
