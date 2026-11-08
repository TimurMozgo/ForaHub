'use strict';
// One campaign save, two isolated engine documents. Chapter switches stay inside the hub iframe.
(async()=>{
 const {freshCampaign,chapterOf}=await import('./save-model.mjs?v=2026.11.09.2');
 const engine=window.deadChapter||1,clone=v=>JSON.parse(JSON.stringify(v));
 let saved=freshCampaign(),saver,ready=false,restoring=false,launching=false,frozen=false,finishedHandled=false;
 const labels={'c1-1':'Жилой квартал','c1-2':'Рыночный проезд','c1-3':'Мёртвый парк','c1-4':'Промзона','c1-5':'Блокпост',post:'Четвёртый пост',service:'Служебный сектор',tunnel:'Кабельный тоннель',depot:'Ремонтное депо',ending:'Эвакуация',breakdown:'Заглохший грузовик',station:'Северная станция'};
 const roman=n=>['','I','II','III'][n];
 function pause(){if(['combat','arrival',...(engine===2?['c2talk']:[])].includes(state))togglePause();else if(state!=='intro'&&state!=='paused')frozen=true;input.x=input.y=0;keys.clear();audio.ac?.suspend();music.pause();}
 function label(){
  if(!ready)return;const chapter=chapterOf(saved.zone);
  $('start').textContent=saved.completed?'МАРШРУТ ПРОЙДЕН':saved.started?'ПРОДОЛЖИТЬ · '+labels[saved.zone].toUpperCase():'НАЧАТЬ ГЛАВУ I';
  $('intro').querySelector('p').textContent=chapter===1?'Глава I · Из города живыми. Начни путь один, найди выживших и доберись до эвакуации.':chapter===2?'Глава II · По ту сторону ворот. Твой отряд приближается к четвёртому посту.': 'Глава III · На север. Сохрани отряд и продолжи путь к станции.';
  $('campaign-info').textContent=(saved.completed?'Доступный маршрут завершён. ':`Глава ${roman(chapter)} · ${labels[saved.zone]}. `)+(saved.completedChapters.length?`Пройдено глав: ${saved.completedChapters.map(roman).join(', ')}. `:'')+(saved.legacy?'Сохранение прежнего прототипа сохранено. Можно начать историю с главы I.':'Автосохранение на границах локаций и глав.');
  $('campaign-new').hidden=!saved.started;$('campaign-restore').hidden=!saver?.backup();
  const brief=$('intro').querySelector('.brief');if(brief)brief.querySelector('span').textContent='ГЛАВА '+roman(chapter);
  const footer=document.querySelector('footer span');if(footer)footer.textContent='КАМПАНИЯ · ГЛАВЫ I–III';
 }
 function take(zone,phase='entry'){return {zone,started:true,completed:false,phase,completedChapters:[...saved.completedChapters],legacy:saved.legacy,crew:[{...player,name:'ВАНЯ (Я)'},...allies].filter(a=>a.hp>0).map(a=>({name:a.name,type:a.type,hp:a.hp})),kit:{weapon,hasShotgun,money,damage,ammo:player.ammo,reserve:player.reserve,grenades:player.grenades,bank:clone(weaponBank)}};}
 function commit(next){saved=clone(next);saver?.write(saved);label();}
 function checkpointAt(zone,phase='entry'){if(!restoring&&ready)commit(take(zone,phase));}
 function nextChapter(zone,completedChapter){const next=take(zone);next.completedChapters=[...new Set([...saved.completedChapters,completedChapter])].sort();commit(next);}
 function equipSaved(s,keepPositions=false){
  const k=s.kit,positions=allies.map(a=>({name:a.name,x:a.x,y:a.y}));money=k.money;damage=k.damage;weapon=k.weapon;hasShotgun=k.hasShotgun;weaponBank=clone(k.bank);
  Object.assign(player,{type:s.crew[0].type,hp:s.crew[0].hp,ammo:k.ammo,reserve:k.reserve,grenades:k.grenades,mag:k.weapon==='shotgun'?6:12,reload:0});
  allies=s.crew.slice(1).map((a,i)=>{const p=keepPositions?positions.find(p=>p.name===a.name):null;return {...actor(p?.x??112+(i%5)*28,p?.y??1170+Math.floor(i/5)*22,a.type),name:a.name,hp:a.hp};});
 }
 let entries={};
 if(engine===1){
  const arrival=beginArrival;beginArrival=function(){checkpointAt('c1-'+stage);return arrival();};
  const shop=enterShop;enterShop=function(){shop();checkpointAt('c1-'+stage,'shop');};
  const purchase=buy;buy=function(id){purchase(id);if(state==='shop')checkpointAt('c1-'+stage,'shop');};
  const ending=showEnding;showEnding=function(win){ending(win);if(win&&!finishedHandled){finishedHandled=true;nextChapter('post',1);$('restart').textContent='ГЛАВА II · ПРОДОЛЖИТЬ';$('endtext').textContent='Вы выбрались из города. Отряд, оружие и припасы сохранены. Следующая остановка — четвёртый пост.';}else if(!win)$('restart').textContent='ПОВТОРИТЬ С КОНТРОЛЬНОЙ ТОЧКИ';};
 }else{
  entries={service:beginServiceSector,tunnel:beginCableTunnel,depot:beginDepotArrival,ending:beginChapterTwoEnding,breakdown:beginTruckBreakdown,station:beginStation};
  beginServiceSector=function(){checkpointAt('service');return entries.service();};
  beginCableTunnel=function(){checkpointAt('tunnel');return entries.tunnel();};
  beginDepotArrival=function(){checkpointAt('depot');return entries.depot();};
  beginChapterTwoEnding=function(){if(chapterTwo?.zone!=='breakdown')checkpointAt('ending');return entries.ending();};
  beginTruckBreakdown=function(){checkpointAt('breakdown');const carry=take('breakdown');const result=entries.breakdown();equipSaved(carry,true);return result;};
  beginStation=function(){checkpointAt('station');return entries.station();};
  const finish=finishChapterTwo;finishChapterTwo=function(){finish();if(!finishedHandled){finishedHandled=true;nextChapter('breakdown',2);$('c2replay').textContent='ГЛАВА III · ПРОДОЛЖИТЬ';$('c2finished').querySelectorAll('p')[1].textContent='Отряд и снаряжение сохранены. Продолжи путь на север.';}};
 }
 function capture(){if(engine===1&&ready&&!restoring&&state==='shop'&&saved.phase==='shop')saved=take('c1-'+stage,'shop');return clone(saved);}
 async function switchEngine(){const destination=chapterOf(saved.zone)===1?'index.html':'chapter-two.html';if(await saver.handoff(saved))location.replace(destination+'?v=2026.11.09.2');}
 function menu(){pause();state='intro';frozen=false;for(const id of ['ending','paused','shop',...(engine===2?['c2finished','c2dialogue']:[])])$(id).classList.add('hidden');$('intro').classList.remove('hidden');label();}
 async function launch(){
  if(!ready||!saver||launching||$('start').disabled)return;
  if(saved.completed){menu();return;}
  if((chapterOf(saved.zone)===1?1:2)!==engine){await switchEngine();return;}
  launching=true;restoring=true;frozen=false;finishedHandled=false;const target=clone(saved);
  try{
   $('game').classList.remove('breakdown-scene');$('paused').classList.add('hidden');window.deadSessionStorage.data={};
   if(engine===1){
    await audio.start();reset();stage=Number(target.zone.slice(3));equipSaved(target);
    buildMap();makeEnemies();setupEncounters();player.x=176;player.y=1155;cam=clamp(player.y-viewH*.64,0,H-viewH);
    if(target.phase==='shop'){
     state='shop';shopEnd=Date.now()+30000;shopSeconds=30;$('shopdistrict').textContent=LEVELS[stage-1].name;$('timer').textContent='30';$('timerbar').style.width='100%';$('shop').classList.remove('hidden');renderShop();
    }else beginArrival();
    saved={...target,started:true};
   }else{
    window.deadSessionStorage.setItem('dead-route-evacuated-v1',JSON.stringify({version:1,crew:target.crew}));
    await c2Start();if(!chapterTwo||state==='intro')return;equipSaved(target);
    if(target.zone!=='post'){
     chapterTwo.drive?.stop();chapterTwo.drive=null;chapterTwo.talk=null;$('c2dialogue').classList.add('hidden');
     window.deadSessionStorage.setItem('dead-route-chapter-two-v1',JSON.stringify({version:1,crew:target.crew}));
     if(target.zone==='ending'){beginDepotDefense();equipSaved(target);chapterTwo.depot.progress=90;chapterTwo.depot.opened=true;}
     entries[target.zone]();if(target.zone==='breakdown')equipSaved(target,true);
    }
    saved={...target,started:true};
   }
   saver.write(saved);hud();
  }catch(e){menu();$('campaign-info').textContent='Не удалось запустить участок. Сохранение осталось на месте. Попробуй ещё раз.';console.error(e);}
  finally{restoring=false;launching=false;$('start').disabled=false;label();}
 }
 async function newCampaign(){if(!ready||!saver?.archive())return;commit(freshCampaign());$('campaign-confirm').hidden=true;menu();if(engine!==1)await switchEngine();else await launch();}
 async function restorePrevious(){const previous=saver?.backup();if(!previous||!saver.archive())return;commit(previous);menu();if((chapterOf(saved.zone)===1?1:2)!==engine)await switchEngine();}
 document.addEventListener('click',e=>{
  const id=e.target.closest?.('button')?.id;if(!['start','restart','c2replay','campaign-new','campaign-confirm-new','campaign-cancel','campaign-restore'].includes(id))return;e.preventDefault();e.stopImmediatePropagation();if(!ready)return;
  if(id==='campaign-new'){$('campaign-confirm').hidden=false;return;}if(id==='campaign-cancel'){$('campaign-confirm').hidden=true;return;}
  if(id==='campaign-confirm-new'){void newCampaign();return;}if(id==='campaign-restore'){void restorePrevious();return;}void launch();
 },true);
 const baseUpdate=update;update=function(dt){
  if(frozen||document.hidden)return;baseUpdate(dt);
  if(engine===2&&!restoring&&ready&&!finishedHandled&&state==='c2done'){
   finishedHandled=true;
   if(chapterTwo?.zone==='breakdown'){commit(take('station'));$('c2replay').textContent='ДАЛЬШЕ · СЕВЕРНАЯ СТАНЦИЯ';$('c2finished').querySelectorAll('p')[1].textContent='Контрольная точка сохранена. Следующий участок готов к прохождению.';}
   else if(chapterTwo?.zone==='station'){const done=take('station');done.completed=true;done.completedChapters=[...new Set([...saved.completedChapters,3])].sort();commit(done);$('c2replay').textContent='В МЕНЮ КАМПАНИИ';}
  }
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)frozen=false;});
 while($('start').disabled)await new Promise(r=>setTimeout(r,100));
 const {createDeadSave}=await import('./save-client.mjs?v=2026.11.09.2');
 saver=await createDeadSave({fresh:freshCampaign,capture,pause,apply:s=>{saved=clone(s);if(ready&&state!=='intro')menu();label();},ready:()=>{ready=true;label();}});label();
})();
