'use strict';
function depotMap(){map=document.createElement('canvas');map.width=W;map.height=H;const g=map.getContext('2d');g.fillStyle='#202b29';g.fillRect(0,0,W,H);obstacles=[{x:0,y:0,w:64,h:H},{x:288,y:0,w:64,h:H},{id:'depot-gate',x:64,y:250,w:224,h:18}];
 for(let y=0;y<H;y+=24){g.fillStyle=y%48?'#3b443d':'#414940';g.fillRect(64,y,224,23);for(const x of [20,296]){g.fillStyle='#52605a';g.fillRect(x,y,36,21);g.fillStyle='#283732';g.fillRect(x+2,y+3,32,3);}}
 for(const [x,y]of [[68,610],[244,760],[68,940]]){obstacles.push({x,y,w:40,h:45});g.drawImage(images.tiles,...QUEST_ART.crate,x,y,40,45);}
 g.fillStyle='#b3a16f';g.font='bold 12px sans-serif';g.textAlign='center';g.fillText('РЕМОНТНОЕ ДЕПО',176,110);goalFlows.clear();flow=null;
}
function beginDepotDefense(){chapterTwo.zone='depot';chapterTwo.done=false;chapterTwo.depot={running:false,started:false,progress:0,elapsed:0,wave:0,worker:null,opened:false,hold:0,finished:false};
 stage=3;checkpoint=null;depotMap();enemies=[];pendingEnemies=[];bullets=[];particles=[];corpses=[];survivors=[];drops=[];total=0;kills=0;brute=null;
 const d=chapterTwo.depot;d.winch={x:224,y:410,id:'winch',label:'ЛЕБЁДКА'};d.exit={x:176,y:190,id:'depot-exit',label:'ПРОЙТИ ЧЕРЕЗ ВОРОТА'};
 player.x=176;player.y=460;player.reserve+=36;player.grenades+=2;allies.filter(a=>a.hp>0).forEach((a,i)=>{a.repairSite=null;a.repairing=false;a.depotPost=null;a.depotReposition=0;a.x=100+(i%5)*37;a.y=500+Math.floor(i/5)*28;});
 horror={charge:1,restored:true,blackout:0,batteries:[],omenPlayed:true,entryGroups:0};mission.power=true;mission.generator=d.winch;mission.boxes=[];cam=clamp(player.y-viewH*.64,0,H-viewH);state='combat';music.stop(1);$('bossbar').classList.add('hidden');$('controls').style.display='';hud();showNotice('ЗАПУСТИ ЛЕБЁДКУ · ПОДОЙДИ И УДЕРЖИВАЙ ДЕЙСТВИЕ');}
function depotWorker(){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d||!d.running||d.opened)return null;if(!d.worker||d.worker.hp<=0)d.worker=allies.filter(a=>a.hp>0).sort((a,b)=>dist(a,d.winch)-dist(b,d.winch))[0]||null;return d.worker;}
const depotBuildBase=assignCheckpointBuilders;
assignCheckpointBuilders=function(){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d)return depotBuildBase();const worker=depotWorker();allies.forEach(a=>{a.building=false;a.repairSite=a===worker?'depot-winch':null;a.repairing=a===worker&&dist(a,d.winch)<28;});};
const depotPostBase=checkpointAllyGoal;
checkpointAllyGoal=function(a,i){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d||d.opened)return depotPostBase(a,i);if(a===depotWorker())return d.winch;return depotGuardPosition(a,i);};
const depotGoalBase=horrorGoal;
horrorGoal=function(){const d=chapterTwo?.depot;return chapterTwo?.zone==='depot'&&d?(d.opened?d.exit:d.winch):depotGoalBase();};
const depotHudBase=c2Hud;
c2Hud=function(){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d)return depotHudBase();$('district').textContent='ГЛАВА II / РЕМОНТНОЕ ДЕПО';$('phase').textContent=d.opened?'ПРОХОД ОТКРЫТ':d.running?'ОБОРОНА ЛЕБЁДКИ':'ПОДГОТОВКА';$('objective').textContent=d.opened?'ПРОВЕДИ ОТРЯД ЧЕРЕЗ ВОРОТА':'ПРИКРОЙ ТОГО, КТО ОТКРЫВАЕТ ВОРОТА';$('remaining').textContent=Math.floor(d.progress/90*100)+'%';$('progress').style.width=d.progress/90*100+'%';$('tasklist').innerHTML=[['Запустить лебёдку',d.started],['Поднять ворота · '+Math.floor(d.progress)+'/90 сек',d.opened],['Пройти через открытый проезд',d.finished]].map(([t,done])=>'<div class="'+(done?'done':'')+'"><i></i>'+t+'</div>').join('');};
function depotWave(){const d=chapterTwo.depot;spawnPressure(Math.min(24,10+allies.filter(a=>a.hp>0).length+d.wave*2),'depot');d.wave++;entryDelay=.5;if(d.wave===5){pendingEnemies.push({...actor(176,1100,4),boss:true,hp:850,maxHp:850,speed:36,phase:'approach',timer:0,attack:0,slam:0});total++;}}
const depotUpdateBase=updateMission;
updateMission=function(dt){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d)return depotUpdateBase(dt);if(state!=='combat')return;
 const near=dist(player,d.winch)<42&&visible(player,d.winch),worker=depotWorker(),solo=d.running&&!worker;
 $('interact').disabled=!near||d.opened;$('interactionlabel').textContent=d.running?(solo?'КРУТИТЬ':'ОСТАНОВИТЬ'):'ЗАПУСТИТЬ';
 if(near&&interactHeld&&!player.moving&&player.hit<=0&&!d.opened&&!solo){d.hold+=dt;if(d.hold>=1.2){d.hold=0;interactHeld=false;d.running=!d.running;if(d.running&&!d.started){d.started=true;music.play('chapter-two-depot',.24);depotWave();}showNotice(d.running?'ЛЕБЁДКА РАБОТАЕТ · ПРИКРОЙ НАПАРНИКА':'ЛЕБЁДКА ОСТАНОВЛЕНА · ПРОГРЕСС СОХРАНЁН');}}else d.hold=0;
 $('interactionbar').style.width=d.hold/1.2*100+'%';let message='ПОДОЙДИ К ЛЕБЁДКЕ И УДЕРЖИВАЙ ДЕЙСТВИЕ';
 if(d.running&&!d.opened){d.elapsed+=dt;if(d.wave<5&&d.elapsed>=d.wave*18)depotWave();const a=depotWorker()||player,danger=enemies.some(e=>e.hp>0&&dist(e,a)<55),ready=dist(a,d.winch)<28&&a.hit<=0;
 if(ready&&!danger&&(a!==player||interactHeld&&!player.moving))d.progress=Math.min(90,d.progress+dt);
 message=danger?'ЗОМБИ У ЛЕБЁДКИ · ПРИКРОЙ!':!ready?'НАПАРНИК ИДЁТ К ЛЕБЁДКЕ':a===player?'УДЕРЖИВАЙ ДЕЙСТВИЕ · ТЫ РАБОТАЕШЬ ОДИН':a.name+' ПОДНИМАЕТ ВОРОТА · ПРИКРЫВАЙ';
 if(d.progress>=90){d.opened=true;d.running=false;obstacles=obstacles.filter(o=>o.id!=='depot-gate');goalFlows.clear();flow=null;allies.forEach(a=>{a.repairSite=null;a.repairing=false;});audio.effect('shelter-door',.35);showNotice('ВОРОТА ОТКРЫТЫ · ВЫВОДИ ОТРЯД!');}}
 if(d.started&&!d.running&&!d.opened)message='ПАУЗА · ВОЗОБНОВИ ЛЕБЁДКУ, КОГДА ГОТОВ';if(d.opened)message='К ЗЕЛЁНОЙ МЕТКЕ ЗА ВОРОТАМИ · УБИВАТЬ ВСЕХ НЕ НУЖНО';c2Hud();$('missionhint').textContent=message;
 if(d.opened&&!d.finished)beginChapterTwoEnding();
};
const depotDrawBase=drawMission;
drawMission=function(){const d=chapterTwo?.depot;if(chapterTwo?.zone!=='depot'||!d)return depotDrawBase();ctx.textAlign='center';ctx.font='bold 9px sans-serif';const gap=224*d.progress/90;for(let x=64;x<288;x+=16)if(Math.abs(x+8-176)>gap/2)questSprite('barricade',x+8,268,16,24);ctx.fillStyle='#dccb9c';ctx.fillText('ВОРОТА · '+Math.floor(d.progress/90*100)+'%',176,225);
 questSprite('generator',d.winch.x,d.winch.y,32,32);ctx.strokeStyle='#b6a77b';ctx.beginPath();ctx.moveTo(d.winch.x,d.winch.y-20);ctx.lineTo(265,266);ctx.stroke();ctx.fillStyle='#dfd5b1';ctx.fillText('ЛЕБЁДКА',d.winch.x,d.winch.y-42);
 if(d.running){ctx.save();ctx.translate(d.winch.x,d.winch.y-16);ctx.rotate(clock*4);ctx.strokeStyle='#efe3ad';ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.stroke();ctx.restore();}ctx.fillStyle='#15241b';ctx.fillRect(104,286,144,6);ctx.fillStyle='#b9d293';ctx.fillRect(104,286,144*d.progress/90,6);
 if(d.opened){ctx.strokeStyle='#c5e8a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(d.exit.x,d.exit.y,30+Math.sin(clock*3)*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e3efbf';ctx.fillText('ВЫХОД',d.exit.x,d.exit.y-39);}};
const depotSpawnBase=spawnEdgeEnemies;
spawnEdgeEnemies=function(dt){if(chapterTwo?.zone!=='depot'||!chapterTwo.depot)return depotSpawnBase(dt);if(!pendingEnemies.length||enemies.filter(e=>e.hp>0).length>=28)return;entryDelay-=dt;if(entryDelay>0)return;const y=cam+viewH+45;if(y>H-30)return;for(let i=0;i<3&&pendingEnemies.length;i++){const x=100+((chapterTwo.depot.wave+i*3+enemies.length)%5)*38;if(blocked(x,y,12))continue;const e=pendingEnemies.shift();e.x=x;e.y=y;e.enteringRound=true;enemies.push(e);}entryDelay=1.4;};

function depotGuardPosition(a,i){
 const d=chapterTwo.depot;
 if(a.depotPost&&clock<(a.depotReposition||0)&&!blocked(a.depotPost.x,a.depotPost.y,12))return a.depotPost;
 a.depotReposition=clock+1.05+(i%3)*.2;
 const threats=enemies.filter(e=>e.hp>0&&e.entryY===undefined&&dist(e,d.winch)<390).sort((e,f)=>dist(e,d.winch)-dist(f,d.winch));
 const target=threats[i%Math.min(3,threats.length)],ideal={x:176+Math.sin(i*2.4)*78,y:465+Math.cos(i*2.4)*48};
 let best=null,bestScore=Infinity;
 for(let y=365;y<=575;y+=30)for(let x=88;x<=268;x+=30){const p={x,y};if(blocked(x,y,12)||dist(p,d.winch)<44)continue;
 let score=dist(a,p)*.12+(a.depotPost?dist(p,a.depotPost)*.08:0);
 if(target){const range=dist(p,target);score+=Math.abs(range-(a.hp<35?205:145))*.9;if(!visible(p,target))score+=100;for(const e of threats)if(dist(p,e)<85)score+=(85-dist(p,e))*3.5;if(a.hp<35)score+=Math.max(0,y-430)*.5;}
 else score+=dist(p,ideal);
 for(const other of allies)if(other!==a&&other.hp>0){const separation=dist(p,other.depotPost||other);if(separation<40)score+=(40-separation)*3;}
 if(score<bestScore){bestScore=score;best=p;}}
 a.depotPost=best||{x:a.x,y:a.y};return a.depotPost;
}
