'use strict';
window.chaseAudio=(()=>{
 let context=null,buffers=null,source=null,gain=null,desired=false,loading=null,error=false;
 const oneShots=new Set();
 let enabled=true;try{enabled=localStorage.getItem('police-sound')!=='off';}catch{}
 const button=document.createElement('button');button.id='sound-toggle';button.setAttribute('aria-label','Включить или выключить звук игры');document.querySelector('.header-actions').prepend(button);
 function ui(){button.textContent=enabled?'♫':'♪';button.setAttribute('aria-pressed',String(enabled));button.title=error?'Не удалось загрузить звук · нажмите, чтобы повторить':enabled?'Выключить звук':'Включить звук';}
 function stop(){for(const s of oneShots){try{s.stop();}catch{}}oneShots.clear();if(source){source.stop();source.disconnect();source=null;}}
 function sync(){
  if(!desired||!enabled||document.hidden||context?.state!=='running'){stop();return;}
  if(source||!buffers)return;
  source=context.createBufferSource();source.buffer=buffers[0];source.loop=true;
  // The source is already loopable; preserve its complete cycle.
  source.loopStart=0;source.loopEnd=buffers[0].duration;
  source.connect(gain);source.start(0,source.loopStart);
 }
 async function unlock(){
  if(!enabled)return;
  try{
   context ||= new (window.AudioContext||window.webkitAudioContext)();
   if(!gain){gain=context.createGain();gain.gain.value=.32*.8;gain.connect(context.destination);}
   await context.resume();
   if(!loading&&!buffers){loading=Promise.all(['police-siren.mp3','police-command.mp3'].map(async file=>{const r=await fetch('audio/'+file);if(!r.ok)throw Error(file);return context.decodeAudioData(await r.arrayBuffer());}));
    try{buffers=await loading;error=false;}catch(e){error=true;console.warn('Siren audio unavailable',e);}finally{loading=null;ui();}
   }else if(loading)await loading.catch(()=>{});
   sync();
  }catch(e){error=true;ui();}
 }
 button.onclick=()=>{enabled=error?true:!enabled;try{localStorage.setItem('police-sound',enabled?'on':'off');}catch{}if(enabled)unlock();else stop();ui();};
 document.addEventListener('pointerdown',()=>{if(context?.state!=='running'||!buffers)unlock();},{passive:true});
 document.addEventListener('keydown',()=>{if(context?.state!=='running'||!buffers)unlock();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 ui();
 return {unlock,setActive(value){desired=value;sync();},command(){if(!enabled||!buffers||context?.state!=='running')return;const s=context.createBufferSource();s.buffer=buffers[1];s.connect(gain);oneShots.add(s);s.onended=()=>{oneShots.delete(s);s.disconnect();};s.start();},snapshot:()=>({enabled,active:!!source,desired,loaded:!!buffers,error,state:context?.state,durations:buffers?.map(b=>b.duration)})};
})();
