'use strict';
function stationMap(){
 breakdownRoadMap();const g=map.getContext('2d');g.fillStyle='#394039';g.fillRect(36,80,280,1020);
 obstacles=[{x:0,y:0,w:24,h:H},{x:328,y:0,w:24,h:H},{x:24,y:810,w:175,h:65},{x:150,y:510,w:178,h:65},{x:24,y:270,w:170,h:65}];
 for(const o of obstacles.slice(2)){g.fillStyle='#182720';g.fillRect(o.x,o.y,o.w,o.h);g.strokeStyle='#657362';g.strokeRect(o.x+3,o.y+3,o.w-6,o.h-6);g.fillStyle='#78816b';for(let x=o.x+12;x<o.x+o.w-12;x+=25)g.fillRect(x,o.y+12,12,8);}
 g.fillStyle='#a2a28b';for(const x of [290,308])g.fillRect(x,80,3,680);for(let y=85;y<760;y+=18){g.fillStyle='#5e5845';g.fillRect(286,y,30,4);}
 g.font='bold 12px sans-serif';g.fillStyle='#c1c5a0';g.fillText('СТАНЦИЯ · СЕВЕРНАЯ',65,105);goalFlows.clear();flow=null;
}
function beginStation(){
 chapterTwo.finale?.drive?.stop();chapterTwo.finale=null;chapterTwo.done=false;chapterTwo.zone='station';chapterTwo.station={step:0,hold:0,noise:0,wave:0,carry:false,elapsed:0,repair:0};
 stationMap();enemies=[];pendingEnemies=[];survivors=[];bullets=[];drops=[];corpses=[];checkpoint=null;brute=null;total=0;kills=0;stage=3;
 player.x=176;player.y=1120;player.reserve+=48;allies=allies.filter(a=>a.hp>0);allies.forEach((a,i)=>{a.x=100+i%5*30;a.y=1160+Math.floor(i/5)*26;a.repairSite=null;});
 mission.boxes=[];mission.power=false;horror={charge:1,restored:true,blackout:0,batteries:[],omenPlayed:true};state='combat';cam=clamp(player.y-viewH*.6,0,H-viewH);music.stop(1);$('c2finished').classList.add('hidden');$('hud').style.visibility='';$('controls').style.display='';
 chapterTwo.station.nodes=[{x:245,y:940,label:'ОСМОТРЕТЬ МАСТЕРСКУ'},{x:95,y:650,label:'НАЙТИ РЕМЕНЬ В ЯЩИКЕ'},{x:245,y:400,label:'ВСКРЫТЬ СКЛАД'},{x:100,y:180,label:'ЗАБРАТЬ АККУМУЛЯТОР'},{x:176,y:1080,label:'ДОСТАВИТЬ ДЕТАЛИ'}];
 c2Talk([['ВОДИТЕЛЬ','На одном стартере далеко не уедем. Нужны ремень и живой аккумулятор.'],['АЛИНА','За платформой мастерская. Только света здесь нет…'],['СОНЯ','Там кто-то ходит. Давайте потише.'],['ВАНЯ (Я)','Идём вместе. Найдём детали и сразу назад.']],()=>hud());
}
function stationWave(count){spawnPressure(count,'station');}
const stationGoalBase=horrorGoal;horrorGoal=function(){return chapterTwo?.zone==='station'?chapterTwo.station.nodes[Math.min(chapterTwo.station.step,4)]:stationGoalBase();};
const stationMoveBase=move;move=function(a,dx,dy){if(chapterTwo?.zone==='station'&&chapterTwo.station.carry&&a===player){dx*=.65;dy*=.65;}stationMoveBase(a,dx,dy);};
const stationMissionBase=updateMission;
updateMission=function(dt){if(chapterTwo?.zone!=='station')return stationMissionBase(dt);if(state!=='combat')return;const s=chapterTwo.station;s.elapsed+=dt;const goal=horrorGoal(),near=dist(player,goal)<40&&visible(player,goal),danger=enemies.some(e=>e.hp>0&&dist(e,player)<55),duration=[3,4,8,3,12][Math.min(s.step,4)];
 $('interact').disabled=!near||s.step>4;$('interactionlabel').textContent=s.step===4?'РЕМОНТ':s.step===2?'ВСКРЫТЬ':'ОБЫСК';
 if(near&&interactHeld&&!player.moving&&!danger&&player.hit<=0&&s.step<5){s.hold+=dt;if(s.step===0||s.step===1){if(!s.searching){audio.startAction('search');s.searching=true;}}if(s.step===2){s.noise+=dt;if(s.wave===0&&s.noise>=2){s.wave=1;stationWave(10);music.play('chapter-two-service',.17);showNotice('МЕТАЛЛ ЗАГРЕМЕЛ · ОНИ ИДУТ НА ШУМ!');}}
 if(s.hold>=duration){audio.stopAction();s.searching=false;s.hold=0;interactHeld=false;s.step++;if(s.step===1){stationWave(5);showNotice('ЗАПИСКА: РЕМЕНЬ В ЯЩИКЕ У ПЛАТФОРМЫ. АККУМУЛЯТОР — НА СКЛАДЕ');}if(s.step===2)showNotice('РЕМЕНЬ НАЙДЕН · СКЛАД ПРИДЁТСЯ ВСКРЫТЬ');if(s.step===3){stationWave(8);showNotice('СКЛАД ОТКРЫТ · ЗАБЕРИ АККУМУЛЯТОР');}if(s.step===4){s.carry=true;s.nextWave=s.elapsed+10;showNotice('АККУМУЛЯТОР ТЯЖЁЛЫЙ · КОМАНДА ПРИКРЫВАЕТ. НАЗАД К ГРУЗОВИКУ!');}if(s.step===5){s.carry=false;music.stop(2);enemies=[];pendingEnemies=[];c2Talk([['ВОДИТЕЛЬ','Вот теперь другое дело. Заряд есть, ремень держится.'],['ДАНИЛ','На платформе следы. Свежие. Люди уходили вдоль путей.'],['АЛИНА','Значит, конвой мог добраться до узла. Нам туда.']],()=>{state='c2done';$('c2finished').querySelector('.eyebrow').textContent='ГЛАВА III · СТАНЦИЯ ПРОЙДЕНА';$('c2finished').querySelector('h2').textContent='ЕСТЬ СЛЕД';$('c2finished').querySelector('p').textContent='Грузовик отремонтирован. Вдоль путей найдены следы выживших.';const p=$('c2finished').querySelectorAll('p');if(p[1])p[1].textContent='Следующий участок ещё в разработке.';$('c2finished').classList.remove('hidden');});return;}}
 }else{if(s.searching){audio.stopAction();s.searching=false;}}
 if(s.carry&&s.elapsed>=s.nextWave){s.nextWave=s.elapsed+18;if(enemies.filter(e=>e.hp>0).length+pendingEnemies.length<24)stationWave(5);}
 $('interactionbar').style.width=s.hold/duration*100+'%';c2Hud();if(danger&&near)$('missionhint').textContent='ОТОГОНИ ЗОМБИ, ЧТОБЫ ПРОДОЛЖИТЬ · ПРОГРЕСС СОХРАНЁН';
};
const stationHudBase=c2Hud;c2Hud=function(){if(chapterTwo?.zone!=='station')return stationHudBase();const s=chapterTwo.station;$('district').textContent='ГЛАВА III / СЕВЕРНАЯ СТАНЦИЯ';$('phase').textContent=s.carry?'ПЕРЕНОСКА ДЕТАЛИ':'ПОИСК ДЕТАЛЕЙ';$('objective').textContent=horrorGoal().label;$('remaining').textContent=Math.min(s.step,5)+'/5';$('progress').style.width=s.step*20+'%';$('tasklist').innerHTML='<div>Ремень: '+(s.step>=2?'найден':'не найден')+' · Аккумулятор: '+(s.step>=4?'найден':'не найден')+'</div>';$('missionhint').textContent='ПОДОЙДИ К МЕТКЕ И УДЕРЖИВАЙ ДЕЙСТВИЕ';};
const stationDrawBase=drawMission;drawMission=function(){if(chapterTwo?.zone!=='station')return stationDrawBase();const s=chapterTwo.station;drawChapterTwoTruck(176,1165,[]);s.nodes.forEach((n,i)=>{if(i<4)questSprite('crate',n.x,n.y,28,28);if(i!==s.step)return;ctx.strokeStyle='#daed9d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,32,0,Math.PI*2);ctx.stroke();ctx.textAlign='center';ctx.font='bold 10px sans-serif';ctx.fillStyle='#f0f6c9';ctx.fillText(n.label,n.x,n.y-42);});if(s.carry)questSprite('crate',player.x,player.y-20,14,14);};
// Continue the existing road escape, preserving the living roster and supplies.
const stationEvacBase=updateChapterTwoEnding;updateChapterTwoEnding=function(dt){stationEvacBase(dt);if(chapterTwo?.zone==='breakdown'&&chapterTwo.finale?.route&&chapterTwo.talk)chapterTwo.talk.done=beginStation;};
