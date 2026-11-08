'use strict';
function c2Roster(){try{const s=JSON.parse(window.deadSessionStorage.getItem('dead-route-evacuated-v1'));if(s?.version===1&&Array.isArray(s.crew)&&s.crew.length>=1&&s.crew.length<=16&&s.crew.every(a=>Number.isInteger(a.type)&&a.type>=1&&a.type<=5&&typeof a.name==='string'&&a.name.length<40))return s.crew;}catch{}return [{name:'ВАНЯ (Я)',type:1},{name:'МАРК',type:2},{name:'ВЕРА',type:3},{name:'ЛЕВ',type:4},{name:'НИКА',type:5},{name:'РОМАН',type:2}];}
function c2Crew(){const crew=c2Roster();player.type=crew[0].type;allies=crew.slice(1).map((a,i)=>({...actor(112+(i%5)*28,1170+Math.floor(i/5)*22,a.type),name:a.name}));chapterTwo.parked=[];chapterTwo.startCount=crew.length;}
const c2TalkBase=c2Talk;
c2Talk=function(lines,done,road=false){const available=allies.filter(a=>a.hp>0);lines=lines.map(([name,text])=>{if(['МАРК','ВЕРА','ЛЕВ','НИКА','РОМАН','ДАНИЛ','СОНЯ'].includes(name)&&!available.some(a=>a.name===name))name=available[0]?.name||'ВАНЯ (Я)';return [name,text];});c2TalkBase(lines,done,road);};
function beginServiceSector(){
 chapterTwo.zone='service';chapterTwo.done=false;chapterTwo.hold=0;chapterTwo.active=null;chapterTwo.sector={pass:false,open:false,arrived:false};
 stage=4;buildMap();stage=2;goalFlows.clear();flow=null;enemies=[];pendingEnemies=[];bullets=[];particles=[];drops=[];corpses=[];kills=0;total=0;
 player.x=176;player.y=1140;allies.filter(a=>a.hp>0).forEach((a,i)=>{const p=safeQuestPoint(112+(i%5)*28,1180-Math.floor(i/5)*25);a.x=p.x;a.y=p.y;});
 const spot=(x,y,id,label)=>({...safeQuestPoint(x,y),id,label});
 const s=chapterTwo.sector;s.desk=spot(240,965,'pass','ПРОПУСК ОХРАНЫ');s.lock={x:126,y:600,id:'lock',label:'ВОРОТА ВО ДВОР'};s.exit=spot(176,180,'alina','ДИСПЕТЧЕРСКАЯ · АЛИНА');
 c2BuildCourtyard();survivors=[[46,584,'ДАНИЛ',4],[66,617,'СОНЯ',3]].map(([x,y,name,type],i)=>({...actor(x,y,type),name,id:'service-survivor-'+i,saved:false,alerted:false,locked:true}));
 cam=clamp(player.y-viewH*.64,0,H-viewH);state='combat';mission.power=false;mission.boxes=[];music.play('chapter-two-service',.17);spawnPressure(10,'service');
 c2Talk([['ВАНЯ (Я)','Идём всем отрядом. Никто не остаётся у машины.'],['АЛИНА · РАЦИЯ','Служебный сектор впереди. Двое заперлись во дворе. Заберите их и идите к диспетчерской.'],['МАРК','Сначала пропуск охраны. Потом открываем ворота.']],()=>hud());
}
const c2GoalBase=horrorGoal;
horrorGoal=function(){const s=chapterTwo?.sector;if(chapterTwo?.zone!=='service'||!s)return c2GoalBase();return !s.pass?s.desk:!s.open?s.lock:survivors.find(a=>!a.saved&&a.hp>0)||s.exit;};
const c2HudBase=c2Hud;
c2Hud=function(){if(chapterTwo?.zone!=='service')return c2HudBase();const s=chapterTwo.sector,n=survivors.filter(a=>a.saved).length,tasks=[['Найти пропуск охраны',s.pass],['Открыть ворота во двор',s.open],['Спасти выживших '+n+'/2',n===2],['Добраться до Алины',s.arrived]],done=tasks.filter(t=>t[1]).length;$('district').textContent='ГЛАВА II / СЛУЖЕБНЫЙ СЕКТОР';$('phase').textContent='СПАСЕНИЕ';$('objective').textContent='ЛЮДИ ЖДУТ ПОМОЩИ';$('remaining').textContent=done+'/4';$('progress').style.width=done*25+'%';$('tasklist').innerHTML=tasks.map(([t,d])=>'<div class="'+(d?'done':'')+'"><i></i>'+t+'</div>').join('');$('missionhint').textContent='ЦЕЛЬ: '+(horrorGoal()?.label||'ПОДОЙДИ К МЕТКЕ SOS');};
const c2EncountersBase=updateEncounters;
updateEncounters=function(){if(chapterTwo?.zone!=='service')return c2EncountersBase();for(const a of survivors){if(a.saved||a.locked||a.hp<=0)continue;if(dist(player,a)<32&&visible(player,a)){a.saved=true;allies.push({...actor(a.x,a.y,a.type),hp:a.hp,name:a.name});audio.play('pickup');showNotice(a.name+' С НАМИ · ОТРЯД '+(1+allies.filter(x=>x.hp>0).length));hud();if(survivors.every(x=>x.saved))c2Talk([['ДАНИЛ','Ночью сюда привезли людей с южной дороги. Потом закрыли внутренние ворота.'],['ВЕРА','Они уже были заражены?'],['СОНЯ','Когда приехали — они разговаривали.'],['ВАНЯ (Я)','Держитесь рядом. Идём к Алине.']],()=>{spawnPressure(8,'service-escape');hud();});}}};
const c2VictimsBase=attackableSurvivors;
attackableSurvivors=function(){return c2VictimsBase().filter(a=>!a.locked);};
const c2MissionBase=updateMission;
updateMission=function(dt){if(chapterTwo?.zone!=='service')return c2MissionBase(dt);if(state!=='combat')return;chapterTwo.elapsed+=dt;const s=chapterTwo.sector,goal=horrorGoal();
 if(survivors.some(a=>!a.saved&&a.hp<=0)){end(false);$('endtext').textContent='Не удалось спасти обоих выживших. В следующий раз прикрой их после открытия ворот.';return;}
 const action=!s.pass?s.desk:!s.open?s.lock:null,near=action&&dist(player,action)<43&&visible(player,action);$('interact').disabled=!near;$('interactionlabel').textContent=near?(s.pass?'ОТКРЫТЬ':'ОБЫСКАТЬ'):'ДЕЙСТВИЕ';
 if(near&&interactHeld&&!player.moving&&player.hit<=0){if(chapterTwo.active!==action.id){chapterTwo.active=action.id;audio.startAction('search');}chapterTwo.hold+=dt;if(chapterTwo.hold>=2.4){if(!s.pass){s.pass=true;player.reserve+=36;showNotice('ПРОПУСК НАЙДЕН · ОТКРОЙ ВОРОТА ВО ДВОР');}else{s.open=true;obstacles=obstacles.filter(o=>o.id!=='courtyard-gate');goalFlows.clear();flow=null;survivors.forEach(a=>{a.locked=false;a.alerted=true});audio.effect('shelter-door',.25);showNotice('ВОРОТА ОТКРЫТЫ · ПОДОЙДИ К ОБОИМ ВЫЖИВШИМ');}chapterTwo.hold=0;chapterTwo.active=null;interactHeld=false;audio.stopAction();hud();}}else if(chapterTwo.hold||chapterTwo.active){chapterTwo.hold=0;chapterTwo.active=null;audio.stopAction();}
 $('interactionbar').style.width=Math.min(100,chapterTwo.hold/2.4*100)+'%';c2Hud();
 if(dist(player,s.exit)<78&&!s.arrived&&!survivors.every(a=>a.saved))$('missionhint').textContent='АЛИНА: СНАЧАЛА ЗАБЕРИТЕ ДАНИЛА И СОНЮ ИЗ ДВОРА';if(survivors.every(a=>a.saved)&&dist(player,s.exit)<70&&!s.arrived){s.arrived=true;c2Talk([['АЛИНА','Вы добрались! Быстрее внутрь, здесь можно перевести дух.'],['ВАНЯ (Я)','С нами ещё двое из двора. Им нужна помощь.'],['АЛИНА','У стены аптечка. Мы закрыли внутренний сектор и думали, что продержимся до утра.'],['ВЕРА','Сколько там людей?'],['АЛИНА','Я не знаю, сколько осталось людьми.'],['ВАНЯ (Я)','Есть другой выход?'],['АЛИНА','Через ремонтное депо. Но блокировку придётся снять из кабельного тоннеля.']],beginCableTunnel);}
};
const c2DrawMissionBase=drawMission;
drawMission=function(){if(chapterTwo?.zone!=='service')return c2DrawMissionBase();const s=chapterTwo.sector;ctx.font='bold 8px sans-serif';ctx.textAlign='center';questSprite('crate',s.desk.x,s.desk.y,26,26);ctx.fillStyle='#e2cca0';ctx.fillText(s.desk.label,s.desk.x,s.desk.y-37);
 ctx.fillStyle='#e3d1a6';ctx.fillText('ЗАКРЫТЫЙ ДВОР',59,566);ctx.fillText(s.open?'ПРОХОД ОТКРЫТ':'ВОРОТА · ПРОПУСК',151,649);if(!s.open){ctx.save();ctx.translate(97,600);ctx.rotate(Math.PI/2);questSprite('barricade',0,0,40,12);ctx.restore();}else{ctx.strokeStyle='#bdd49b';ctx.beginPath();ctx.moveTo(93,580);ctx.lineTo(114,573);ctx.stroke();}
 const near=dist(player,s.exit)<78,ready=survivors.every(a=>a.saved),r=38+Math.sin(clock*3)*3;ctx.fillStyle=near?'#d5e9a22e':'#c7df9b14';ctx.strokeStyle=near?'#efffc4':'#b8d994';ctx.lineWidth=near?3:1.5;ctx.beginPath();ctx.arc(s.exit.x,s.exit.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#d7e9b8';ctx.font='bold 9px sans-serif';ctx.fillText('АЛИНА · ТОЧКА ВСТРЕЧИ',s.exit.x,s.exit.y+58);ctx.font='8px sans-serif';ctx.fillText(near&&!ready?'СНАЧАЛА СПАСИ ОБОИХ':ready?'ПОДОЙДИ ДЛЯ РАЗГОВОРА':'ДИСПЕТЧЕРСКАЯ',s.exit.x,s.exit.y+73);
 sprite({...actor(s.exit.x,s.exit.y-12,3),anim:clock*4},'c','Idle');};
function c2BuildCourtyard(){
 // Existing west-side houses end at y=549 and begin again at y=640.
 // The yard occupies only the gap; no house or building collision is removed.
 const fences=[{x:20,y:552,w:5,h:84},{x:20,y:552,w:80,h:4},{x:20,y:632,w:80,h:4},{x:94,y:552,w:6,h:28},{x:94,y:620,w:6,h:16},{x:94,y:580,w:6,h:40,id:'courtyard-gate'}];
 obstacles.push(...fences);goalFlows.clear();flow=null;
 const g=map.getContext('2d');g.fillStyle='#36413a';g.fillRect(20,552,80,84);g.fillStyle='#48504a';g.fillRect(28,558,60,68);
 g.fillStyle='#7b7e6740';for(let y=558;y<630;y+=16)for(let x=28;x<90;x+=16)g.fillRect(x,y,14,14);
 for(const o of fences.filter(o=>!o.id)){g.fillStyle='#333e38';g.fillRect(o.x,o.y,o.w,o.h);g.fillStyle='#8d9580';if(o.h>o.w){for(let y=o.y;y<o.y+o.h;y+=9)g.fillRect(o.x,y,o.w,2);}else for(let x=o.x;x<o.x+o.w;x+=9)g.fillRect(x,o.y,2,o.h);}
 g.fillStyle='#668052';g.fillRect(28,622,12,7);g.fillRect(78,558,10,8);
}
