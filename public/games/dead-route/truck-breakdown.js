'use strict';
// Chapter III opening preview; chapter II remains independently playable.
function breakdownRoadMap(){
 map=document.createElement('canvas');map.width=W;map.height=H;const g=map.getContext('2d');
 g.fillStyle='#17231e';g.fillRect(0,0,W,H);
 g.fillStyle='#383d38';g.fillRect(48,0,256,H);
 g.fillStyle='#242b29';g.fillRect(66,0,220,H);
 // Worn lane markings and gravel shoulders make the stranded highway readable.
 g.fillStyle='#aaa98a';g.fillRect(70,0,2,H);g.fillRect(280,0,2,H);
 for(let y=0;y<H;y+=84){g.fillStyle='#9e9d7e';g.fillRect(174,y,4,35);}
 for(let i=0;i<280;i++){const x=(i*73+19)%W,y=(i*137+53)%H;g.fillStyle=x<66||x>286?'#485044':'#303633';g.fillRect(x,y,2+i%3,2);}
 for(let y=30;y<H;y+=150){for(const x of [39,311]){g.fillStyle='#889084';g.fillRect(x,y,4,18);g.fillStyle='#c2b787';g.fillRect(x,y,4,5);}}
 for(let y=95;y<H;y+=215){g.strokeStyle='#171e1c';g.beginPath();g.moveTo(80,y);g.lineTo(127,y+13);g.lineTo(147,y+6);g.stroke();}
 obstacles=[{x:0,y:0,w:24,h:H},{x:328,y:0,w:24,h:H}];goalFlows.clear();flow=null;
}
function beginTruckBreakdown(){
 chapterTwo.drive?.stop();chapterTwo.drive=null;chapterTwo.finale=null;chapterTwo.zone='breakdown';$('game').classList.add('breakdown-scene');music.stop(.3);audio.stopRound();audio.stopEngine();
 breakdownRoadMap();
 enemies=[];pendingEnemies=[];survivors=[];bullets=[];drops=[];corpses=[];checkpoint=null;brute=null;kills=0;total=0;
 let roster=null;try{const save=JSON.parse(window.deadSessionStorage.getItem('dead-route-chapter-two-v1'));if(save?.version===1&&Array.isArray(save.crew)&&save.crew.length&&save.crew.length<=20&&save.crew.every(a=>typeof a.name==='string'&&a.type>=1&&a.type<=5))roster=save.crew;}catch{}
 if(!roster)roster=[{name:'ВАНЯ (Я)',type:player.type},...allies.map(a=>({name:a.name,type:a.type})),{name:'ДАНИЛ',type:4},{name:'СОНЯ',type:3},{name:'АЛИНА',type:3}].filter((a,i,list)=>list.findIndex(b=>b.name===a.name)===i);
 player.type=roster[0].type;player.hp=100;player.x=115;player.y=720;player.reserve=180;player.grenades=5;
 allies=roster.slice(1).map((a,i)=>({...actor(i%2?245:105,750+Math.floor(i/2)*25,a.type),name:a.name}));
 chapterTwo.breakdown={x:176,y:700,hp:1000,maxHp:1000,time:0,battle:0,spawn:0,attempt:0,phase:'exit',roar:null,drive:null};
 mission.boxes=[];mission.power=false;horror={charge:1,restored:true,blackout:0,batteries:[],omenPlayed:true};stage=3;state='combat';cam=clamp(player.y-viewH*.55,0,H-viewH);
 $('hud').style.visibility='';$('controls').style.display='';audio.effect('chapter-two-stop',.3);showNotice('ВОДИТЕЛЬ: ЗАГЛОХЛА! ВСЕМ НАРУЖУ, ПРИКРОЙТЕ МАШИНУ!');hud();
}
function breakdownStarter(){const b=chapterTwo.breakdown;b.starter?.stop();b.starter=audio.effect('truck-starter',.5);}
const breakdownMissionBase=updateMission;
updateMission=function(dt){if(chapterTwo?.zone!=='breakdown')return breakdownMissionBase(dt);const b=chapterTwo.breakdown;if(state!=='combat')return;b.time+=dt;
 if(b.phase==='exit'&&b.time>=3){b.phase='roar';b.time=0;b.roar=audio.effect('park-monster-roar',.55);b.roarDuration=audio.effectBuffers['park-monster-roar']?.duration||6.486;showNotice('СОНЯ: ВЫ ЭТО СЛЫШАЛИ?..');}
 else if(b.phase==='roar'&&b.time>=b.roarDuration){b.phase='wait';b.time=0;showNotice('ВАНЯ: ЗАНИМАЙТЕ ПОЗИЦИИ. НЕ ПОДПУСКАЙТЕ ИХ К ГРУЗОВИКУ!');}
 else if(b.phase==='wait'&&b.time>=18){b.phase='battle';b.time=0;b.spawn=0;showNotice('ВОДИТЕЛЬ: МНЕ НУЖНА МИНУТА! ДЕРЖИТЕ ИХ!');}
 if(b.phase==='wait'||b.phase==='battle'){b.attempt-=dt;if(b.attempt<=0){breakdownStarter();b.attempt=5;}}
 if(b.phase==='battle'){b.battle+=dt;if(b.battle>=60){b.phase='starting';b.time=0;b.roar?.stop();b.starter?.stop();b.startSound=audio.effect('truck-start',.6);showNotice('ВОДИТЕЛЬ: ЗАВЕЛАСЬ! ВСЕ В МАШИНУ!');}}
 if(b.phase==='starting'&&b.time>=(audio.effectBuffers['truck-start']?.duration||5)){b.phase='boarding';truckHorn();showNotice('ВСЕМ В КУЗОВ! ПОДОЙДИ К СВЕТЯЩЕМУСЯ КРУГУ ПОЗАДИ ГРУЗОВИКА');}if(b.phase==='boarding'&&dist(player,{x:b.x,y:b.y+105})<36){b.drive?.stop();b.drive=null;chapterTwo.depot={finished:true};beginChapterTwoEnding();chapterTwo.finale.time=4;chapterTwo.finale.route=false;}
};
const breakdownSpawnBase=spawnEdgeEnemies;
spawnEdgeEnemies=function(dt){if(chapterTwo?.zone!=='breakdown')return breakdownSpawnBase(dt);const b=chapterTwo.breakdown;if(b.phase!=='battle')return;
 b.incoming??=[];for(const e of b.incoming){const dx=e.targetX-e.x,dy=e.targetY-e.y,d=Math.hypot(dx,dy),step=e.speed*dt;e.x+=dx/Math.max(d,1)*Math.min(d,step);e.y+=dy/Math.max(d,1)*Math.min(d,step);e.anim+=dt*6;if(d<step+2){enemies.push(e);e.arrived=true;}}b.incoming=b.incoming.filter(e=>!e.arrived);
 b.spawn-=dt;if(b.spawn>0||enemies.filter(e=>e.hp>0).length+b.incoming.length>=32)return;b.spawn=2.1;
 for(let i=0;i<3;i++){const side=(b.spawnSide??0)%4;b.spawnSide=(b.spawnSide??0)+1;const y=clamp(b.y+(Math.random()-.5)*260,90,H-90),x=90+Math.random()*170;
 const points=[{x,y:cam-55,tx:x,ty:Math.max(85,cam+25)},{x:W+35,y,tx:300,ty:y},{x,y:cam+viewH+55,tx:x,ty:Math.min(H-35,cam+viewH-25)},{x:-35,y,tx:52,ty:y}],p=points[side],e=actor(p.x,p.y,1+Math.floor(Math.random()*3));Object.assign(e,{hp:65+Math.floor(b.battle),speed:45+b.battle*.3,attack:0,pressure:true,targetX:p.tx,targetY:p.ty});b.incoming.push(e);total++;}};
const breakdownAttackBase=attackCheckpoint;
attackCheckpoint=function(e,dt){if(chapterTwo?.zone!=='breakdown')return breakdownAttackBase(e,dt);const b=chapterTwo.breakdown;if(!['battle','starting','boarding'].includes(b.phase))return false;if(dist(e,player)<55||allies.some(a=>a.hp>0&&dist(e,a)<40))return false;if(dist(e,b)>63){const v=navigation(e,b);move(e,v.x*e.speed*dt,v.y*e.speed*dt);return true;}e.moving=false;if(e.attack<=0){e.attack=.9;b.hp=Math.max(0,b.hp-22);if(!b.hp)end(false);}return true;};
const breakdownPostBase=checkpointAllyGoal;
checkpointAllyGoal=function(a,i){if(chapterTwo?.zone!=='breakdown')return breakdownPostBase(a,i);const b=chapterTwo.breakdown,angle=i/Math.max(1,allies.length)*Math.PI*2;return{x:b.x+Math.cos(angle)*72,y:b.y+Math.sin(angle)*110};};
const breakdownHudBase=c2Hud;
c2Hud=function(){if(chapterTwo?.zone!=='breakdown')return breakdownHudBase();const b=chapterTwo.breakdown;$('district').textContent='ГЛАВА III / ЗАГЛОХШИЙ ГРУЗОВИК';$('phase').textContent=b.phase==='battle'?'ОБОРОНА':b.phase==='boarding'?'К МАШИНЕ!':'ЗАНЯТЬ ПОЗИЦИИ';$('objective').textContent='СОХРАНИТЕ ГРУЗОВИК';$('remaining').textContent=Math.ceil(b.hp/b.maxHp*100)+'%';$('progress').style.width=b.hp/b.maxHp*100+'%';$('tasklist').innerHTML='<div>Грузовик: '+Math.ceil(b.hp/b.maxHp*100)+'% · '+(b.phase==='battle'?'До запуска: '+Math.max(0,Math.ceil(60-b.battle))+' сек':'Прикрывайте водителя')+'</div>';$('missionhint').textContent=b.phase==='boarding'?'ПОДОЙДИТЕ К ГРУЗОВИКУ — ПОРА УЕЗЖАТЬ':'НЕ ДАЙТЕ ЗОМБИ УНИЧТОЖИТЬ МАШИНУ';};
const breakdownDrawBase=drawMission;
drawMission=function(){if(chapterTwo?.zone!=='breakdown')return breakdownDrawBase();const b=chapterTwo.breakdown;for(const e of b.incoming||[])sprite(e,'z','Walk');drawChapterTwoTruck(b.x,b.y,[]);ctx.fillStyle='#181c18';ctx.fillRect(b.x-35,b.y-90,70,7);ctx.fillStyle=b.hp<300?'#e16e59':'#b5cb85';ctx.fillRect(b.x-35,b.y-90,70*b.hp/b.maxHp,7);if(['starting','boarding'].includes(b.phase)){const y=b.y+105;ctx.beginPath();ctx.arc(b.x,y,32+Math.sin(clock*5)*3,0,Math.PI*2);ctx.fillStyle='#cbe99144';ctx.fill();ctx.strokeStyle='#e2ffa7';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#efffca';ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillText('ПОСАДКА',b.x,y+4);ctx.fillText('ПОДОЙДИ СЮДА',b.x,y+51);}};
const breakdownEndBase=showEnding;
showEnding=function(win){breakdownEndBase(win);if(chapterTwo?.zone==='breakdown'){const b=chapterTwo.breakdown;b.roar?.stop();b.drive?.stop();b.starter?.stop();b.startSound?.stop();$('endtitle').textContent=b.hp<=0?'ГРУЗОВИК УНИЧТОЖЕН':'ОТРЯД НЕ ВЫБРАЛСЯ';$('endtext').textContent='Отряд остался без пути к отступлению. Повторите первый уровень третьей главы. Пройденные главы сохранены.';}};
const breakdownEvacBase=updateChapterTwoEnding;
updateChapterTwoEnding=function(dt){if(chapterTwo?.zone!=='breakdown')return breakdownEvacBase(dt);const f=chapterTwo.finale,limit=6+f.crew.length*.85+5;if(f.time+dt>=limit&&!f.route){f.time=limit;f.boarded=f.crew.length;f.route=true;c2Talk([['ВОДИТЕЛЬ','Держится… Только бы снова не заглохнуть.'],['ВАНЯ (Я)','Все здесь? Проверяйте друг друга.'],['АЛИНА','До станции недалеко. Там поищем детали.']],()=>{f.drive?.stop();f.drive=null;state='c2done';chapterTwo.done=true;$('c2finished').querySelector('.eyebrow').textContent='ГЛАВА III · ПЕРВЫЙ УРОВЕНЬ ПРОЙДЕН';$('c2finished').querySelector('h2').textContent='СНОВА В ПУТИ';$('c2finished').querySelector('p').textContent='Грузовик удалось сохранить. Следующая остановка — станция.';const p=$('c2finished').querySelectorAll('p');if(p[1])p[1].textContent='Продолжение третьей главы ещё в разработке.';$('c2finished').classList.remove('hidden');});return;}breakdownEvacBase(dt);};

