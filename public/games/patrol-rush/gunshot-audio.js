'use strict';
window.gunshotAudio=(()=>{
 let ctx,buffer,loading,paused=false,error=false,played=0;const sources=new Set(),timers=new Set();
 const enabled=()=>!paused&&!document.hidden&&(window.chaseAudio?.snapshot().enabled??true);
 async function unlock(){if(!enabled())return;try{ctx ||= new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();if(!buffer&&!loading){loading=fetch('audio/gunshot.mp3').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).then(b=>{buffer=b;error=false;}).catch(()=>{error=true;}).finally(()=>{loading=null;});}if(loading)await loading;}catch{error=true;}}
 function stop(){for(const t of timers)clearTimeout(t);timers.clear();for(const s of sources){try{s.stop();}catch{}}sources.clear();}
 function play(){if(!enabled()||!buffer||ctx?.state!=='running')return false;const s=ctx.createBufferSource(),gain=ctx.createGain();s.buffer=buffer;gain.gain.value=.52*.8;s.connect(gain);gain.connect(ctx.destination);sources.add(s);s.onended=()=>{sources.delete(s);s.disconnect();gain.disconnect();};s.start();played++;return true;}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 document.addEventListener('click',e=>{if(e.target.closest?.('#sound-toggle')&&!enabled())stop();});
 return {unlock,play,burst(count=3,interval=.16){play();for(let n=1;n<count;n++){const t=setTimeout(()=>{timers.delete(t);play();},n*interval*1000);timers.add(t);}},setPaused(v){paused=!!v;if(paused)stop();},stop,snapshot:()=>({loaded:!!buffer,duration:buffer?.duration,played,active:sources.size,error,paused})};
})();
