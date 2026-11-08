'use strict';
// Restart locations from checkpoints without serializing audio or cutscene callbacks.
(async()=>{
 const clone=v=>JSON.parse(JSON.stringify(v));
 const fresh=()=>({zone:'post',started:false,completed:false,crew:[{name:'ВАНЯ (Я)',type:1,hp:100},{name:'МАРК',type:2,hp:100},{name:'ВЕРА',type:3,hp:100},{name:'ЛЕВ',type:4,hp:100},{name:'НИКА',type:5,hp:100},{name:'РОМАН',type:2,hp:100}],kit:{weapon:'pistol',hasShotgun:false,money:0,damage:18,ammo:12,reserve:96,grenades:3,bank:{pistol:{ammo:12,reserve:72},shotgun:{ammo:6,reserve:18}}}});
 let saved=fresh(),saver,ready=false,restoring=false,launching=false,pausedForHub=false;
 const labels={post:'Четвёртый пост',service:'Служебный сектор',tunnel:'Кабельный тоннель',depot:'Ремонтное депо',ending:'Эвакуация',breakdown:'Заглохший грузовик',station:'Северная станция'};
 function pause(){if(['combat','arrival','c2talk'].includes(state))togglePause();else if(state!=='intro'&&state!=='paused')pausedForHub=true;input.x=input.y=0;keys.clear();audio.ac?.suspend();music.pause();}
 function label(){if(ready)$('start').textContent=saved.started?'ПРОДОЛЖИТЬ · '+labels[saved.zone].toUpperCase():'НАЧАТЬ ГЛАВУ II';}
 function take(zone){return {zone,started:true,completed:false,crew:[{...player,name:'ВАНЯ (Я)'},...allies].filter(a=>a.hp>0).map(a=>({name:a.name,type:a.type,hp:a.hp})),kit:{weapon,hasShotgun,money,damage,ammo:player.ammo,reserve:player.reserve,grenades:player.grenades,bank:clone(weaponBank)}};}
 function checkpointAt(zone){if(restoring||!ready)return;saved=take(zone);saver?.write(saved);}
 const entries={service:beginServiceSector,tunnel:beginCableTunnel,depot:beginDepotArrival,ending:beginChapterTwoEnding,breakdown:beginTruckBreakdown,station:beginStation};
 beginServiceSector=function(){checkpointAt('service');return entries.service();};
 beginCableTunnel=function(){checkpointAt('tunnel');return entries.tunnel();};
 beginDepotArrival=function(){checkpointAt('depot');return entries.depot();};
 beginChapterTwoEnding=function(){if(chapterTwo?.zone!=='breakdown')checkpointAt('ending');return entries.ending();};
 beginTruckBreakdown=function(){checkpointAt('breakdown');return entries.breakdown();};
 beginStation=function(){checkpointAt('station');return entries.station();};
 function equipSaved(s){const k=s.kit;money=k.money;damage=k.damage;weapon=k.weapon;hasShotgun=k.hasShotgun;weaponBank=clone(k.bank);Object.assign(player,{type:s.crew[0].type,hp:s.crew[0].hp,ammo:k.ammo,reserve:k.reserve,grenades:k.grenades,mag:k.weapon==='shotgun'?6:12,reload:0});allies=s.crew.slice(1).map((a,i)=>({...actor(112+(i%5)*28,1170+Math.floor(i/5)*22,a.type),name:a.name,hp:a.hp}));}
 async function launch(newRun=false){
  if(!ready||launching||$('start').disabled)return;launching=true;restoring=true;pausedForHub=false;
  const target=clone(newRun?fresh():saved);
  try{
   $('game').classList.remove('breakdown-scene');$('paused').classList.add('hidden');window.deadSessionStorage.data={};
   await c2Start();if(!chapterTwo||state==='intro')return;
   if(target.started&&target.zone!=='post'){
    chapterTwo.drive?.stop();chapterTwo.drive=null;chapterTwo.talk=null;$('c2dialogue').classList.add('hidden');equipSaved(target);
    window.deadSessionStorage.setItem('dead-route-chapter-two-v1',JSON.stringify({version:1,crew:target.crew}));if(target.zone==='ending'){beginDepotDefense();equipSaved(target);chapterTwo.depot.progress=90;chapterTwo.depot.opened=true;}entries[target.zone]();
   }else if(target.started)equipSaved(target);
   if(target.completed){chapterTwo.talk=null;$('c2dialogue').classList.add('hidden');state='c2done';chapterTwo.done=true;$('hud').style.visibility='hidden';$('controls').style.display='none';$('c2finished').querySelector('.eyebrow').textContent='КОНТРОЛЬНАЯ ТОЧКА СОХРАНЕНА';$('c2finished').querySelector('h2').textContent=target.zone==='station'?'ЕСТЬ СЛЕД':'МАРШРУТ ПРОЙДЕН';const ps=$('c2finished').querySelectorAll('p');ps[0].textContent='Этот участок истории завершён. Твой прогресс сохранён.';if(ps[1])ps[1].textContent='Можно начать главу заново.';$('c2finished').classList.remove('hidden');}
   saved=target.started?target:{...take('post'),started:true};saver.write(saved);hud();
  }finally{restoring=false;launching=false;$('start').disabled=false;label();}
 }
 document.addEventListener('click',e=>{const id=e.target.closest?.('button')?.id;if(!['start','restart','c2replay'].includes(id))return;e.preventDefault();e.stopImmediatePropagation();if(ready)void launch(id==='c2replay');},true);
 const baseUpdate=update;update=function(dt){if(pausedForHub||document.hidden)return;baseUpdate(dt);if(!restoring&&ready&&saved.started&&state==='c2done'&&!saved.completed){saved={...saved,completed:true};saver?.write(saved);}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)pausedForHub=false;});
 while($('start').disabled)await new Promise(r=>setTimeout(r,100));
 const {createDeadSave}=await import('./save-client.mjs?v=2026.11.09.1');
 saver=await createDeadSave({fresh,capture:()=>clone(saved),pause,apply:s=>{saved=clone(s);if(ready&&state!=='intro'){pause();$('intro').classList.remove('hidden');state='intro';}label();},ready:()=>{ready=true;label();}});
})();

