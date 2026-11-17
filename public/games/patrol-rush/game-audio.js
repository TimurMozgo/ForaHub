'use strict';
window.gameAudio=(()=>{
 const names=['step-0','step-1','step-2','door-open','door-close','car-door-open','car-door-close','gear','cell-gate','engine-start-v2','engine-stop-v2','engine-loop','radio-call'],buffers={},active=new Set(),played={};
 let engine=null,engineGain=null,engineRate=1,ctx,loading,last=null,quietUntil=0,radioPending=false,stepIndex=0;const strides=new Map();
 const allowed=()=>!document.hidden&&(window.chaseAudio?.snapshot().enabled??true);
 function stopEngine(){if(engine){try{engine.stop();}catch{}engine.disconnect();engine=null;engineGain.disconnect();engineGain=null;}}
 function stop(){stopEngine();for(const s of active){try{s.stop();}catch{}}active.clear();}
 async function unlock(){if(!allowed())return;try{ctx ||= new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();loading ||= Promise.all(names.map(async n=>{const r=await fetch('audio/'+n+'.mp3');if(!r.ok)throw Error(n);buffers[n]=await ctx.decodeAudioData(await r.arrayBuffer());})).catch(e=>{loading=null;console.warn('Game sound loading',e);});await loading;}catch(e){console.warn('Game audio unlock',e);}}
 function play(n,volume=.35){if(!allowed()||ctx?.state!=='running'||!buffers[n]||performance.now()<quietUntil||active.size>=10)return false;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buffers[n];g.gain.value=volume*.8;s.connect(g);g.connect(ctx.destination);active.add(s);s.onended=()=>{active.delete(s);s.disconnect();g.disconnect();};s.start();played[n]=(played[n]||0)+1;return true;}
 function motor(s){
  const running=['driveOut','driveIn','arrival','departing','chaseLaunch','pursuit','pursuitStop'].includes(s.state)&&!s.modal;
  if(!running||!allowed()||ctx?.state!=='running'||!buffers['engine-loop']){stopEngine();return;}
  if(!engine){engine=ctx.createBufferSource();engine.buffer=buffers['engine-loop'];engine.loop=true;engineGain=ctx.createGain();engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(ctx.destination);engine.start();}
  const dt=last?Math.max(.016,Math.min(.1,(s.at-last.at)/1000)):.016;
  const velocity=s.kmh??(last&&s.inside===last.inside?Math.min(120,Math.hypot(s.x-last.x,s.y-last.y)/dt*.5):0);
  engineRate=.85+Math.min(1,velocity/120)*.7;engine.playbackRate.setTargetAtTime(engineRate,ctx.currentTime,.3);engineGain.gain.setTargetAtTime((.38+Math.min(1,velocity/120)*.16)*.8,ctx.currentTime,.2);
 }
 function capture(){const base=window.stationBase?.snapshot(),street=window.street?.snapshot();if(!base||!street)return null;const inside=base.visible;
 const car=inside?base.vehicle:street.car;return {at:performance.now(),x:car.x,y:car.y,kmh:street.phase==='pursuit'&&!inside?street.chase?.kmh:null,inside,paused:inside?base.paused:street.paused,modal:!inside&&street.modal,state:inside?base.state:street.phase,actors:inside?base.people:[street.player,...street.bots],doors:inside?base.interior.doors:[],frame:inside?base.vehicle.frame:street.car.frame,entry:inside?base.doorOpen:0};}
 function tick(){const s=capture();if(!s)return;
  const changed=last&&(last.state!==s.state||last.inside!==s.inside);
  if(s.inside&&s.state==='incoming'&&(!last||changed))radioPending=true;
  if(s.state!=='incoming')radioPending=false;
  if(!allowed()||s.paused||performance.now()<quietUntil){stop();last=s;strides.clear();return;}
  motor(s);
  if(radioPending&&play('radio-call',.48))radioPending=false;
  if(last&&s.inside===last.inside){
   if(changed){if(['gearEquip','gearUnequip'].includes(s.state))play('gear',.5);if(['driveOut','departing','chaseLaunch'].includes(s.state))play('engine-start-v2',.65);if(['unload','exiting'].includes(s.state))play('engine-stop-v2',.65);}
   for(const d of s.doors){const prev=last.doors.find(x=>x.id===d.id);if(!prev)continue;if(prev.open===0&&d.open>0)play(d.id==='cell'?'cell-gate':'door-open',d.id==='cell'?.45:.5);if(prev.open>0&&d.open===0)play(d.id==='cell'?'cell-gate':'door-close',.48);}
   if(last.entry===0&&s.entry>0)play('door-open',.5);if(last.entry>0&&s.entry===0)play('door-close',.48);
   const opened=f=>[1,2,4,5].includes(f);
   if(!opened(last.frame)&&opened(s.frame))play('car-door-open',.6);
   if(opened(last.frame)&&!opened(s.frame))play('car-door-close',.6);
   if(!s.modal)s.actors.forEach((p,i)=>{const old=last.actors[i];if(!p.visible||!old?.visible)return;const distance=Math.hypot(p.x-old.x,p.y-old.y);if(distance<.01||distance>12)return;const stride=(strides.get(i)||0)+distance;if(stride>=18){play('step-'+(stepIndex++%3),i===0?.17:.08);strides.set(i,stride%18);}else strides.set(i,stride);});
  }
  last=s;
 }
 function frame(){tick();requestAnimationFrame(frame);}requestAnimationFrame(frame);
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 document.addEventListener('click',e=>{if(e.target.closest?.('#base-skip')){stop();quietUntil=performance.now()+300;strides.clear();}if(e.target.closest?.('#accept')){stop();radioPending=false;}if(e.target.closest?.('#sound-toggle')){if(!allowed())stop();else unlock();}},true);
 const header=document.querySelector('#station-base header'),sound=document.createElement('button');sound.id='base-sound';sound.setAttribute('aria-label','Включить или выключить звук');sound.textContent='♫';header.append(sound);sound.onclick=()=>{document.querySelector('#sound-toggle').click();sound.textContent=allowed()?'♫':'♪';if(!allowed())stop();};
 return{unlock,play,stop,tick,snapshot:()=>({loaded:Object.keys(buffers).length,active:active.size,engineActive:!!engine,engineRate,played:{...played},enabled:allowed(),state:ctx?.state})};
})();
