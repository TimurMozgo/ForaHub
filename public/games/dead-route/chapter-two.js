'use strict';
// Isolated chapter-two vertical slice. The published first chapter is untouched.
let chapterTwo=null;
const c2Original={update,draw,hud,togglePause};
const C2_ROAD=[
 ['ВЕРА','Скажите, что мы правда выбрались.'],
 ['МАРК','Из города — да.'],
 ['ВАНЯ (Я)','А сообщение? Почему нельзя открывать ворота?'],
 ['ВОДИТЕЛЬ','Четвёртый пост принимал людей ещё утром. Там врачи, топливо, связь.'],
 ['ЛЕВ','Ты сказал — утром.'],
 ['ВОДИТЕЛЬ','Странно. Здесь всегда кто-нибудь стоял.'],
 ['ВАНЯ (Я)','Выходим всем отрядом. Держитесь рядом. Проверим сторожку.']
];
function c2Talk(lines,done,road=false){noticeTime=0;$('notice').style.opacity=0;chapterTwo.talk={lines,index:0,time:0,done,road};state='c2talk';input.x=input.y=0;keys.clear();interactHeld=false;audio.stopAction();$('controls').style.display='none';$('hud').style.visibility='hidden';$('c2dialogue').classList.remove('hidden');c2Line();}
function c2Line(){const t=chapterTwo.talk,line=t.lines[t.index];t.time=0;$('c2speaker').textContent=line[0];$('c2line').textContent='';$('c2next').textContent='ДАЛЬШЕ';if(t.road&&t.index===5){chapterTwo.drive?.stop();chapterTwo.drive=null;audio.effect('chapter-two-stop',.25);}}
function c2Next(){const t=chapterTwo?.talk;if(!t||state!=='c2talk')return;const line=t.lines[t.index][1];if(t.time*28<line.length){t.time=line.length/28+.1;$('c2line').textContent=line;return;}t.index++;if(t.index<t.lines.length){c2Line();return;}chapterTwo.talk=null;$('c2dialogue').classList.add('hidden');$('controls').style.display='';$('hud').style.visibility='';state='combat';t.done?.();}
async function c2Start(){
 $('start').disabled=true;$('start').textContent='ЗАГРУЗКА ПОСТА…';
 try{await audio.start();if(!audio.ac)throw Error('Не удалось запустить звук');for(const name of ['chapter-two-drive','chapter-two-stop',...(window.location?.search.includes('scene=breakdown')?['truck-start','truck-starter']:[])])if(!audio.effectBuffers[name]){const r=await fetch('assets/audio/'+name+'.wav'+(name==='truck-starter'?'?v=15':''));if(!r.ok)throw Error('Не загрузился звук дороги');audio.effectBuffers[name]=await audio.ac.decodeAudioData(await r.arrayBuffer());}}
 catch(e){$('start').disabled=false;$('start').textContent='ПОВТОРИТЬ ЗАГРУЗКУ';showNotice(e.message);return;}
 chapterTwo?.breakdown?.starter?.stop();chapterTwo?.breakdown?.startSound?.stop();chapterTwo?.drive?.stop();chapterTwo?.finale?.drive?.stop();reset();audio.stopRound();noticeTime=0;$('notice').style.opacity=0;stage=5;buildMap();stage=2;setupEncounters();enemies=[];pendingEnemies=[];survivors=[];weaponDrop=null;checkpoint=null;mission.boxes=[];
 chapterTwo={step:0,elapsed:0,hold:0,active:null,talk:null,done:false,drive:null,parked:[{...actor(176,1220,4),name:'ЛЕВ'},{...actor(176,1220,5),name:'НИКА'}]};
 const points=[[240,980],[104,700],[240,460],[104,280]];
 chapterTwo.nodes=points.map(([x,y],i)=>({...safeQuestPoint(x,y),id:'c2-'+i,label:['ЖУРНАЛ ПОСТА','ЗАПАСНОЙ ПРЕДОХРАНИТЕЛЬ','ПИТАНИЕ СТОРОЖКИ','РАДИОСТАНЦИЯ'][i]}));
 obstacles.push({x:74,y:143,w:212,h:20});player.x=176;player.y=1140;player.reserve=96;player.grenades=3;
 c2Crew();
 horror.batteries=[];horror.omenPlayed=true;cam=clamp(player.y-viewH*.64,0,H-viewH);state='combat';
 $('locationintro').style.opacity=0;$('intro').classList.add('hidden');$('ending').classList.add('hidden');$('c2finished').classList.add('hidden');
 if(window.location?.search.includes('scene=station')){beginTruckBreakdown();beginStation();return;}if(window.location?.search.includes('scene=breakdown')){beginTruckBreakdown();return;}if(!window.location?.search.includes('scene=depot'))music.play('chapter-two-theme',.18);chapterTwo.drive=audio.effect('chapter-two-drive',.22);if(chapterTwo.drive)chapterTwo.drive.loop=true;
 if(window.location?.search.includes('scene=ending')){chapterTwo.drive?.stop();chapterTwo.drive=null;allies.push({...actor(150,1170,4),name:'ДАНИЛ'},{...actor(200,1180,3),name:'СОНЯ'},{...actor(176,1180,3),name:'АЛИНА'});beginDepotDefense();chapterTwo.depot.progress=90;chapterTwo.depot.opened=true;beginChapterTwoEnding();return;}if(window.location?.search.includes('scene=depot')){chapterTwo.drive?.stop();chapterTwo.drive=null;allies.push({...actor(150,1170,4),name:'ДАНИЛ'},{...actor(200,1180,3),name:'СОНЯ'},{...actor(176,1180,3),name:'АЛИНА'});beginDepotArrival();return;}if(window.location?.search.includes('scene=tunnel')){chapterTwo.drive?.stop();chapterTwo.drive=null;allies.push({...actor(150,1170,4),name:'ДАНИЛ'},{...actor(200,1180,3),name:'СОНЯ'});beginCableTunnel();return;}if(window.location?.search.includes('scene=service')){chapterTwo.drive?.stop();chapterTwo.drive=null;beginServiceSector();return;}c2Talk(C2_ROAD,()=>{showNotice('ЧЕТВЁРТЫЙ ПОСТ · НАЙДИ ЖУРНАЛ В СТОРОЖКЕ');hud();},true);hud();
}
launchRoute=c2Start;
const c2Tasks=['Осмотреть журнал в сторожке','Найти запасной предохранитель','Восстановить питание сторожки','Связаться с диспетчерской'];
function c2Hud(){if(!chapterTwo)return;$('district').textContent='ГЛАВА II / ЧЕТВЁРТЫЙ ПОСТ';$('phase').textContent=chapterTwo.talk?.road?'ДОРОГА':'ВНЕШНИЙ ПЕРИМЕТР';$('objective').textContent='КТО ПРЕДУПРЕЖДАЛ ПО РАЦИИ?';$('remaining').textContent=chapterTwo.step+'/4';$('progress').style.width=chapterTwo.step*25+'%';$('tasklist').innerHTML=c2Tasks.map((text,i)=>'<div class="'+(chapterTwo.step>i?'done':'')+'"><i></i>'+text+'</div>').join('');$('missionhint').textContent=chapterTwo.done?'ДИСПЕТЧЕРСКАЯ НА СВЯЗИ':'ЦЕЛЬ: '+(chapterTwo.nodes[chapterTwo.step]?.label||'РАЦИЯ');}
hud=function(){c2Original.hud();c2Hud();};
horrorGoal=function(){return chapterTwo?.nodes[chapterTwo.step]||null;};
updateHorror=function(){};
function c2Complete(){const n=chapterTwo.step++;chapterTwo.hold=0;chapterTwo.active=null;interactHeld=false;audio.stopAction();audio.play('pickup');
 if(n===0)c2Talk([['ВАНЯ (Я)','Последняя запись — приём машин с южной дороги. Потом ни строчки.'],['ВЕРА','Рация не работает. На щитке сгорел предохранитель. Запасные должны быть на складе.']],()=>hud());
 if(n===1){player.reserve+=24;showNotice('ПРЕДОХРАНИТЕЛЬ И ПАТРОНЫ НАЙДЕНЫ');spawnPressure(5,'c2');}
 if(n===2){mission.power=true;c2Talk([['МАРК','Видишь следы на воротах? Их били изнутри.'],['ВАНЯ (Я)','Не открываем. Сначала свяжемся с постом.']],()=>{audio.effect('radio-static',.2);hud();});}
 if(n===3){audio.effect('radio-static',.3);c2Talk([['АЛИНА · РАЦИЯ','Кто у внешнего въезда? Внутренние ворота не трогайте. Вы меня слышите?'],['ВАНЯ (Я)','Слышим. Мы приехали из города. Где вы?'],['АЛИНА · РАЦИЯ','Диспетчерская. Со мной люди. Пройдите через служебный сектор. Только без сирены.'],['МАРК','Что у вас произошло?'],['АЛИНА · РАЦИЯ','Расскажу, когда доберётесь. Сейчас помогите людям на складе.'],['ВАНЯ (Я)','Держитесь. Мы идём.']],beginServiceSector);}
 hud();}
updateMission=function(dt){if(!chapterTwo||state!=='combat')return;chapterTwo.elapsed+=dt;const goal=horrorGoal(),near=goal&&dist(player,goal)<43&&visible(player,goal);$('interact').disabled=!near;$('interactionlabel').textContent=near?['ОСМОТРЕТЬ','ОБЫСКАТЬ','УСТАНОВИТЬ','СВЯЗАТЬСЯ'][chapterTwo.step]:'ДЕЙСТВИЕ';
 if(near&&interactHeld&&!player.moving&&player.hit<=0){if(chapterTwo.active!==goal.id){chapterTwo.active=goal.id;audio.startAction('search');}chapterTwo.hold+=dt;if(chapterTwo.hold>=2.4)c2Complete();}else if(chapterTwo.hold||chapterTwo.active){chapterTwo.hold=0;chapterTwo.active=null;audio.stopAction();}
 $('interactionbar').style.width=Math.min(100,chapterTwo.hold/2.4*100)+'%';c2Hud();};
drawMission=function(){if(!chapterTwo)return;ctx.font='bold 8px sans-serif';ctx.textAlign='center';for(let i=0;i<chapterTwo.nodes.length;i++){const n=chapterTwo.nodes[i];questSprite(i===2?'generator':'crate',n.x,n.y,28,28);ctx.fillStyle=i<chapterTwo.step?'#8a9b81':i===chapterTwo.step?'#f0d39c':'#8e9b91';ctx.fillText(i<chapterTwo.step?'ОСМОТРЕНО':n.label,n.x,n.y-36);if(i===chapterTwo.step){ctx.strokeStyle='#e5ce8e';ctx.beginPath();ctx.arc(n.x,n.y,22+Math.sin(clock*3)*2,0,Math.PI*2);ctx.stroke();}}
 for(let x=90;x<270;x+=32)questSprite('barricade',x,160,32,24);ctx.fillStyle='#c0b796';ctx.fillText('ВНУТРЕННИЙ СЕКТОР · ЗАКРЫТО',176,120);
 drawRescueTruck(176,1220,0,chapterTwo.parked);
 if(mission.power){const n=chapterTwo.nodes[2],g=ctx.createRadialGradient(n.x,n.y,5,n.x,n.y,95);g.addColorStop(0,'#f6e5a438');g.addColorStop(1,'#f6e5a400');ctx.fillStyle=g;ctx.fillRect(n.x-95,n.y-95,190,190);}};
update=function(dt){if(!chapterTwo){c2Original.update(dt);return;}if(document.hidden)return;if(state==='c2talk'){clock+=dt;chapterTwo.talk.time+=dt;const t=chapterTwo.talk;$('c2line').textContent=t.lines[t.index][1].slice(0,Math.floor(t.time*28));return;}if(state==='c2done')return;c2Original.update(dt);};
draw=function(dt){if(chapterTwo?.talk?.road){ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle='#080f10';ctx.fillRect(0,0,W,viewH);ctx.fillStyle='#29322d';ctx.fillRect(70,0,212,viewH);ctx.fillStyle='#b4b295';const moving=chapterTwo.talk.index<5;for(let i=-1;i<12;i++)ctx.fillRect(173,(i*90+(moving?clock*100:0))%(viewH+90),6,38);ctx.fillStyle='#0e1916';ctx.fillRect(0,0,70,viewH);ctx.fillRect(282,0,70,viewH);drawRescueTruck(176+Math.sin(clock*3)*1.1,viewH*.43,0,[player,...allies,...chapterTwo.parked]);ctx.fillStyle='#d7ddc0';ctx.textAlign='center';ctx.font='bold 12px sans-serif';ctx.fillText('ПО ТУ СТОРОНУ ВОРОТ',176,viewH*.18);ctx.font='9px sans-serif';ctx.fillText('ГЛАВА II',176,viewH*.18-22);ctx.setTransform(1,0,0,1,0,0);return;}c2Original.draw(dt);};
togglePause=function(){if(state==='c2talk'){previousState=state;state='paused';music.pause();audio.ac?.suspend();$('paused').classList.remove('hidden');}else c2Original.togglePause();};
$('c2next').addEventListener('click',c2Next);$('c2replay').addEventListener('click',c2Start);
// Replace the old restart listener so a defeat retries this chapter, not chapter one.
$('restart').addEventListener('click',e=>{e.stopImmediatePropagation();c2Start();},true);

const c2Ending=showEnding;showEnding=function(win){c2Ending(win);if(chapterTwo&&!win){$('endlabel').textContent='ГЛАВА II · МАРШРУТ ПРЕРВАН';$('endtext').textContent=chapterTwo.zone==='tunnel'?'Не удалось выбраться из тоннеля. Держись в свете команды. После снятия блокировки можно сразу отходить к выходу.':'До диспетчерской не удалось добраться. Держись рядом с отрядом и следи за припасами.';}};





