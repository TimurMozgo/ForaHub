import * as THREE from 'three';
import {gsap} from 'gsap';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import modelBytes from './daily-chest.glb';
import {getOpeningPrizes,pickOpeningPrize} from '../../components/case-opening-prizes.ts';
const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const embedded=params.has('embed');
const soloIndex=embedded&&/^[0-2]$/.test(params.get('case')??'')?Number(params.get('case')):null;
document.documentElement.classList.toggle('embedded',embedded);
const tellHub=(type,detail={})=>{if(embedded&&window.parent!==window)window.parent.postMessage({type,...detail},location.origin);};
async function start(){
const host=$('#viewport'),scene=new THREE.Scene();scene.background=new THREE.Color('#080e19');scene.fog=new THREE.Fog('#080e19',23,48);
const camera=new THREE.PerspectiveCamera(38,1,.1,60);camera.position.set(4,3.1,7.1);camera.lookAt(0,.35,0);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;host.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Объёмный сундук. Перетащи, чтобы осмотреть со всех сторон.');
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc1f4ff,0x14213b,1.3));
const key=new THREE.DirectionalLight(0xe8f5ff,3.4);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;scene.add(key);
const rim=new THREE.DirectionalLight(0x8bd7e5,1.8);rim.position.set(-4,2,-3);scene.add(rim);
const warm=new THREE.DirectionalLight(0xb2baff,1.1);warm.position.set(4,1,-4);scene.add(warm);
// A horizon-free backdrop replaces the floor; model lighting stays unchanged.
const backdropTextures=new Map();
function setBackdrop(index){
 if(!backdropTextures.has(index)){
  const rgb=[[50,188,255],[189,85,255],[255,183,53]][index]??[50,188,255];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#05070d';ctx.fillRect(0,0,1024,1024);
  const glow=(x,y,r,alpha)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+rgb.join(',')+','+alpha+')');g.addColorStop(.4,'rgba('+rgb.join(',')+','+alpha*.4+')');g.addColorStop(1,'rgba('+rgb.join(',')+',0)');ctx.fillStyle=g;ctx.fillRect(0,0,1024,1024);};
  glow(512,490,510,.24);glow(430,360,350,.09);glow(650,610,420,.07);
  const vignette=ctx.createRadialGradient(512,480,230,512,512,720);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.7)');ctx.fillStyle=vignette;ctx.fillRect(0,0,1024,1024);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;backdropTextures.set(index,texture);
 }
 scene.background=backdropTextures.get(index);
}
setBackdrop(soloIndex??1);
const light=new THREE.PointLight(0x22edff,0,6,2);light.position.set(0,.5,0);scene.add(light);
const loaded=await new GLTFLoader().parseAsync(modelBytes.buffer,'');
const variants=[{name:'Искра',color:0x32bcff},{name:'Импульс',color:0xbd55ff},{name:'Легенда',color:0xffb735}];
const boxes=variants.map((variant,i)=>{
 const object=loaded.scene.getObjectByName('DailyChest').clone(true),materials=new Set(),glows=new Set();
 const materialMap=new Map();object.traverse(o=>{if(o.isMesh){if(!materialMap.has(o.material)){const m=o.material.clone();if(m.emissiveIntensity>1){m.color.setHex(variant.color);m.emissive.setHex(variant.color);glows.add(m);}else if(i===2&&m.color.r>.25)m.color.setHex(0xc5a76c);materialMap.set(o.material,m);materials.add(m);}o.material=materialMap.get(o.material);}});
 const nodes=Object.fromEntries(['front','back','left','right','lid','base','core'].map(n=>[n,object.getObjectByName(n)]));
 scene.add(object);return {object,parts:nodes,materials,glows,homes:new Map(Object.values(nodes).map(p=>[p,{position:p.position.clone(),rotation:p.rotation.clone()}]))};
});
let selected=soloIndex??1,chest=boxes[selected].object,parts=boxes[selected].parts,glowMaterials=boxes[selected].glows;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.3,.35,1.6);composer.addPass(bloom);composer.addPass(new OutputPass());
const reward=new THREE.Group();const rewardMat=new THREE.MeshStandardMaterial({color:0xffd05a,metalness:.8,roughness:.2,emissive:0xb75f03,emissiveIntensity:.2});
const outline=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.27:.6;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?outline.lineTo(x,y):outline.moveTo(x,y);}outline.closePath();
const rewardGeo=new THREE.ExtrudeGeometry(outline,{depth:.15,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035});rewardGeo.center();const star=new THREE.Mesh(rewardGeo,rewardMat);reward.add(star);reward.visible=false;scene.add(reward);
// Preload the selected collection before signalling ready: no image popping at reveal.
const textureLoader=new THREE.TextureLoader(),prizeTextures=new Map();
const collectionIndices=soloIndex===null?[0,1,2]:[soloIndex];
const imageUrls=[...new Set(collectionIndices.flatMap(i=>getOpeningPrizes(i).map(p=>p.image).filter(Boolean)))];
await Promise.all(imageUrls.map(async url=>{const texture=await textureLoader.loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;prizeTextures.set(url,texture);}));
const giftMaterial=new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
const giftSprite=new THREE.Sprite(giftMaterial);giftSprite.scale.set(2.55,2.55,1);giftSprite.renderOrder=3;reward.add(giftSprite);
const auraCanvas=document.createElement('canvas');auraCanvas.width=auraCanvas.height=256;
const auraContext=auraCanvas.getContext('2d'),gradient=auraContext.createRadialGradient(128,128,8,128,128,128);
gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.3,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');auraContext.fillStyle=gradient;auraContext.fillRect(0,0,256,256);
const auraTexture=new THREE.CanvasTexture(auraCanvas),auraMaterial=new THREE.SpriteMaterial({map:auraTexture,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const aura=new THREE.Sprite(auraMaterial);aura.scale.set(4.7,4.7,1);aura.renderOrder=2;reward.add(aura);
star.renderOrder=4;star.scale.setScalar(1.35);
function preparePrize(index){
 const prize=pickOpeningPrize(index);star.visible=prize.kind==='star';giftSprite.visible=!star.visible;
 if(prize.image){giftMaterial.map=prizeTextures.get(prize.image);giftMaterial.needsUpdate=true;}
 auraMaterial.color.setHex(variants[index].color);$('#result h2').textContent=prize.label;
 $('#result small').textContent=prize.topPrize?'ГЛАВНЫЙ ПРИЗ':prize.kind==='gem'?'КОЛЛЕКЦИОННЫЙ ПОДАРОК':'ТВОЙ ПРИЗ';
}
const particleMat=new THREE.MeshBasicMaterial({color:0x88ffff,transparent:true,opacity:0,depthWrite:false});const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,5,4),particleMat,64);particles.frustumCulled=false;scene.add(particles);
const vectors=Array.from({length:64},(_,i)=>new THREE.Vector3(Math.cos(i*2.399)*(.8+i%5*.15),Math.sin(i*1.7)*1.1+.3,Math.sin(i*2.399)*(.8+i%5*.15)));const dummy=new THREE.Object3D();
const fx={energy:0,burst:0};let timeline=null,state='idle',raf=0,drag=null,moved=false,disposed=false;
function reset(){tellHub('gacha-audio',{cue:'stop'});timeline?.kill();timeline=null;state='idle';
 boxes.forEach((b,i)=>{b.object.visible=soloIndex===null||i===soloIndex;b.object.position.set(soloIndex===null?(i-1)*2.15:0,soloIndex===null?-.35:0,0);b.object.rotation.set(0,.15,0);b.object.scale.setScalar(soloIndex===null?.6:1);for(const [p,h]of b.homes){p.position.copy(h.position);p.rotation.copy(h.rotation);p.scale.setScalar(1);}b.materials.forEach(m=>{m.opacity=1;m.transparent=false;});b.glows.forEach(m=>m.emissiveIntensity=1.5);});
 reward.visible=false;reward.scale.setScalar(0);fx.energy=fx.burst=0;particleMat.opacity=0;light.intensity=0;bloom.strength=.3;$('#open').hidden=true;$('#status').textContent='Нажми на один из трёх боксов';$('#result').hidden=true;$('#resume').hidden=true;$('#choices').hidden=false;document.querySelectorAll('[data-box]').forEach(b=>b.disabled=false);$('h1').textContent='Выбери свой бокс';if(soloIndex!==null){$('#choices').hidden=true;$('#reset').hidden=true;$('h1').textContent=variants[soloIndex].name;$('.title p').textContent='Твой сундук готов к открытию';$('#status').textContent='Готовим открытие…';}resize();}
function open(index=selected){if(state==='opening')return;if(state==='result')reset();selected=soloIndex??(Number.isInteger(index)?index:selected);if(!boxes[selected])return;chest=boxes[selected].object;parts=boxes[selected].parts;glowMaterials=boxes[selected].glows;state='opening';$('#open').disabled=true;$('#choices').hidden=true;document.querySelectorAll('[data-box]').forEach(b=>b.disabled=true);$('h1').textContent=variants[selected].name;light.color.setHex(variants[selected].color);particleMat.color.setHex(variants[selected].color);$('#status').textContent='Энергия нарастает…';
setBackdrop(selected);preparePrize(selected);
const angle=chest.rotation.y,gentle=$('#gentle').checked,turn=gentle?0:Math.PI*2;
timeline=gsap.timeline({paused:true,onComplete:()=>{state='result';$('#open').hidden=false;$('#open').disabled=false;$('#open').textContent='Открыть ещё раз';$('#status').textContent='';}});
timeline.addLabel('windup',0)
 .call(()=>tellHub('gacha-audio',{cue:'charge',index:selected}),[],0)
 .to(chest.rotation,{y:angle+turn*1.5,x:gentle?0:.12,duration:2,ease:'power2.in'},0)
 .to(chest.position,{y:.3,duration:2,ease:'power2.inOut'},0)
 .to(fx,{energy:1,duration:2,ease:'power2.in'},0)
 .addLabel('vortex',2)
 .to(chest.rotation,{y:angle+turn*3.3,x:gentle?0:-.09,duration:.8,ease:'none'},2)
 .to(chest.scale,{x:.88,y:.88,z:.88,duration:.4,ease:'power2.inOut'},2)
 .addLabel('stop',2.8)
 .to(chest.rotation,{y:angle+turn*4,x:0,duration:1.1,ease:'power4.out'},2.8)
 .to(chest.scale,{x:1,y:1,z:1,duration:1.1,ease:'power4.out'},2.8)
 .addLabel('burst',4.15)
 .call(()=>{$('#status').textContent='Сундук раскрывается…';tellHub('gacha-audio',{cue:'burst',index:selected});},[],4.15)
 .to(parts.lid.position,{y:2.5,z:-.8,duration:1,ease:'power3.out'},4.15)
 .to(parts.lid.rotation,{x:-.8,z:-.25,duration:1,ease:'power3.out'},4.15)
 .to(parts.front.position,{z:2.2,y:-.35,duration:1,ease:'power3.out'},4.25)
 .to(parts.front.rotation,{x:.75,duration:1,ease:'power3.out'},4.25)
 .to(parts.back.position,{z:-2.2,y:-.35,duration:1,ease:'power3.out'},4.25)
 .to(parts.back.rotation,{x:-.75,duration:1,ease:'power3.out'},4.25)
 .to(parts.left.position,{x:-2.2,y:-.3,duration:1,ease:'power3.out'},4.25)
 .to(parts.left.rotation,{z:.75,duration:1,ease:'power3.out'},4.25)
 .to(parts.right.position,{x:2.2,y:-.3,duration:1,ease:'power3.out'},4.25)
 .to(parts.right.rotation,{z:-.75,duration:1,ease:'power3.out'},4.25)
 .to(parts.core.position,{y:1,duration:1,ease:'power2.out'},4.25)
 .to(fx,{burst:1,duration:1.3,ease:'power2.out'},4.15)
 .to(bloom,{strength:gentle?.45:.85,duration:.2},4.15)
 .to(bloom,{strength:.4,duration:.9},4.35)
 .addLabel('prize',5.65)
 .to(chest.scale,{x:0,y:0,z:0,duration:.6,ease:'power3.in'},5.65)
 .call(()=>{tellHub('gacha-audio',{cue:'prize',index:selected});chest.visible=false;reward.visible=true;reward.position.set(0,.35,0);reward.quaternion.copy(camera.quaternion);$('#result').hidden=false;},[],5.9)
 .to(reward.scale,{x:1.2,y:1.2,z:1.2,duration:1.2,ease:'elastic.out(1,.5)'},5.9)
 .to(reward.scale,{x:1,y:1,z:1,duration:.45,ease:'sine.inOut'},7.1)
 .to(fx,{energy:.35,duration:1.2},5.9);
if(soloIndex!==null){timeline.play();return;}
const opening=timeline;timeline=gsap.timeline();
boxes.forEach((b,i)=>{if(i!==selected){b.materials.forEach(m=>m.transparent=true);timeline.to([...b.materials],{opacity:0,duration:.65,ease:'power2.inOut'},0).to(b.object.scale,{x:.4,y:.4,z:.4,duration:.65,ease:'power2.inOut'},0).set(b.object,{visible:false},.7);}});
timeline.to(chest.position,{x:0,y:0,z:0,duration:1.05,ease:'power3.inOut'},0)
 .to(chest.scale,{x:1,y:1,z:1,duration:1.05,ease:'power3.inOut'},0)
 .to(camera.position,{x:3.5,y:2.9,z:Math.max(7.4,5.6/camera.aspect),duration:1.05,ease:'power3.inOut'},0)
 .add(opening.play(),1.15);
}
function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;if(state==='idle'){if(soloIndex!==null)camera.position.set(3.5,2.9,Math.max(7.4,5.6/camera.aspect));else camera.position.set(0,3,Math.max(9,9/camera.aspect));}camera.lookAt(0,.35,0);camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);}
const observer=new ResizeObserver(resize);observer.observe(host);resize();
function render(time){if(disposed)return;raf=requestAnimationFrame(render);if(document.hidden)return;
 const t=time*.001;light.intensity=fx.energy*3;glowMaterials.forEach(m=>m.emissiveIntensity=1.5+fx.energy*3);
 if(state==='idle'){parts.core.rotation.y=t*.3;}
 if(reward.visible){star.rotation.y=Math.sin(t*.8)*.2;giftMaterial.rotation=Math.sin(t*.9)*.025;auraMaterial.opacity=.75+Math.sin(t*1.5)*.12;}
 particleMat.opacity=fx.burst>0?Math.max(0,1-fx.burst)*.9:fx.energy*.55;
 vectors.forEach((v,i)=>{const r=fx.burst>0?1+fx.burst*3:1.8-((t*.45+i/64)%1)*1.5;dummy.position.copy(v).multiplyScalar(r);dummy.position.y+=.2;dummy.scale.setScalar(.6+i%3*.4);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);});particles.instanceMatrix.needsUpdate=true;
 camera.lookAt(0,.35,0);composer.render();}
$('#open').onclick=()=>open(selected);$('#reset').onclick=reset;document.querySelectorAll('[data-box]').forEach(b=>b.onclick=()=>open(Number(b.dataset.box)));
window.addEventListener('message',e=>{if(!embedded||e.source!==window.parent||e.origin!==location.origin)return;if(e.data?.type==='gacha-open'&&Number.isInteger(e.data.index)&&e.data.index>=0&&e.data.index<3)open(e.data.index);});
$('#gentle').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{if(state!=='idle')return;drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointerup',e=>{if(drag&&state==='idle'&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<12){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(boxes.filter(b=>b.object.visible).map(b=>b.object),true)[0];if(hit){const i=boxes.findIndex(b=>{let p=hit.object;while(p){if(p===b.object)return true;p=p.parent;}return false;});if(i>=0)open(i);}}drag=null;});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&timeline?.isActive()){timeline.pause();tellHub('gacha-audio',{cue:'pause'});$('#resume').hidden=false;}});$('#resume').onclick=()=>{tellHub('gacha-audio',{cue:'resume'});timeline?.resume();$('#resume').hidden=true;};
$('#download').onclick=()=>{const blob=new Blob([modelBytes],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daily-chest.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();tellHub('gacha-audio',{cue:'stop'});timeline?.pause();$('#status').textContent='Графический контекст потерян. Обнови страницу.';$('#open').disabled=true;tellHub('gacha-error');});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);timeline?.kill();observer.disconnect();composer.dispose();backdropTextures.forEach(texture=>texture.dispose());prizeTextures.forEach(texture=>texture.dispose());auraTexture.dispose();env.dispose();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material))m.dispose();}});},{once:true});
reset();$('#download').disabled=false;render(0);tellHub('gacha-ready');window.chestDemo={scene,chest,open,reset,get timeline(){return timeline;}};
}
start().catch(e=>{$('#status').textContent='Не удалось запустить 3D: '+e.message;tellHub('gacha-error');console.error(e);});
