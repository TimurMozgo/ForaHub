'use strict';
function c2TunnelMap(){
 map=document.createElement('canvas');map.width=W;map.height=H;const g=map.getContext('2d');g.fillStyle='#10191b';g.fillRect(0,0,W,H);
 const halls=[{x:144,y:1088,w:112,h:160},{x:96,y:960,w:160,h:160},{x:96,y:688,w:64,h:432},{x:96,y:640,w:160,h:160},{x:192,y:384,w:64,h:416},{x:96,y:336,w:160,h:144},{x:96,y:64,w:64,h:416}];
 const floor=(x,y)=>halls.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);obstacles=[];
 for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){if(!floor(x+8,y+8)){obstacles.push({x,y,w:16,h:16});continue;}g.fillStyle=(x+y)%32?'#42493f':'#4b5145';g.fillRect(x,y,15,15);
 for(const [dx,dy]of [[-16,0],[16,0],[0,-16],[0,16]])if(!floor(x+8+dx,y+8+dy)){g.fillStyle='#758073';g.fillRect(x+(dx>0?13:0),y+(dy>0?13:0),dx?3:16,dy?3:16);g.fillStyle='#3b5a4e';g.fillRect(x+4,y+4,3,3);}}
 g.font='bold 8px sans-serif';g.textAlign='center';g.fillStyle='#a9b695';g.fillText('ЩИТОВАЯ ←',208,984);g.fillText('КАБЕЛЬНЫЙ УЗЕЛ →',160,668);g.fillText('К ДЕПО ←',200,362);goalFlows.clear();flow=null;
}
function beginCableTunnel(){
 chapterTwo.zone='tunnel';chapterTwo.done=false;chapterTwo.hold=0;chapterTwo.active=null;chapterTwo.tunnel={battery:false,first:false,second:false,clock:0,blackout:0,arrived:false};
 stage=3;checkpoint=null;enemies=[];pendingEnemies=[];corpses=[];bullets=[];particles=[];drops=[];survivors=[];kills=0;total=0;brute=null;
 c2TunnelMap();player.x=176;player.y=1140;player.reserve+=12;player.hp=Math.min(100,player.hp+20);
 allies=allies.filter(a=>a.hp>0);if(!allies.some(a=>a.name==='АЛИНА'))allies.push({...actor(176,1180,3),name:'АЛИНА'});
 allies.forEach((a,i)=>{const p=safeQuestPoint(160+(i%3)*28,1175+Math.floor(i/3)*20);a.x=p.x;a.y=p.y;a.hit=0;});
 horror={charge:1,restored:true,blackout:0,batteries:[],omenPlayed:true,entryGroups:0};mission.power=false;mission.generator={x:176,y:700};mission.boxes=[];
 chapterTwo.tunnel.nodes=[{id:'tunnel-battery',x:220,y:1010,label:'АККУМУЛЯТОР'},{id:'tunnel-first',x:128,y:710,label:'ПИТАНИЕ ЩИТОВОЙ'},{id:'tunnel-second',x:224,y:420,label:'БЛОКИРОВКА ДЕПО'},{id:'tunnel-exit',x:128,y:135,label:'ВЫХОД К ДЕПО'}];
 cam=clamp(player.y-viewH*.64,0,H-viewH);state='combat';$('bossbar').classList.add('hidden');music.stop(.65);
 c2Talk([['АЛИНА','Через тоннель выйдем прямо к депо. Я с вами. Сначала найдём аккумулятор для щитовой.'],['ВАНЯ (Я)','Идём вместе. Фонари держите на проходе.'],['СОНЯ','Только не оставляйте нас здесь…']],()=>hud());
}
const tunnelGoalBase=horrorGoal;
horrorGoal=function(){if(chapterTwo?.zone==='tunnel'){const t=chapterTwo.tunnel;return t.nodes[!t.battery?0:!t.first?1:!t.second?2:3];}return tunnelGoalBase();};
const tunnelHudBase=c2Hud;
c2Hud=function(){if(chapterTwo?.zone!=='tunnel')return tunnelHudBase();const t=chapterTwo.tunnel,tasks=[['Найти исправный аккумулятор',t.battery],['Восстановить питание щитовой',t.first],['Снять блокировку депо',t.second],['Выбраться из тоннеля',t.arrived]],done=tasks.filter(x=>x[1]).length;$('district').textContent='ГЛАВА II / КАБЕЛЬНЫЙ ТОННЕЛЬ';$('phase').textContent=t.second?'ОТХОД К ДЕПО':'ПОД ЗЕМЛЁЙ';$('objective').textContent=t.second?'К ВЫХОДУ · УБИВАТЬ ВСЕХ НЕ НУЖНО':'НАЙДИ ПУТЬ ЧЕРЕЗ ТОННЕЛЬ';$('remaining').textContent=done+'/4';$('progress').style.width=done*25+'%';$('tasklist').innerHTML=tasks.map(([text,d])=>'<div class="'+(d?'done':'')+'"><i></i>'+text+'</div>').join('');$('missionhint').textContent=t.second?'ВЫХОД ОТКРЫТ · НЕ ЗАДЕРЖИВАЙСЯ':'ЦЕЛЬ: '+horrorGoal().label;};
const tunnelLightBase=lightRadius;
lightRadius=function(i=0){if(chapterTwo?.zone!=='tunnel')return tunnelLightBase(i);const t=chapterTwo.tunnel;return (i?72:105)*(t.blackout>0?.7:1)+Math.sin(clock*1.8+i)*3;};
const tunnelMissionBase=updateMission;
updateMission=function(dt){if(chapterTwo?.zone!=='tunnel')return tunnelMissionBase(dt);if(state!=='combat')return;const t=chapterTwo.tunnel;t.clock+=dt;t.blackout=Math.max(0,t.blackout-dt);horror.blackout=t.blackout;const goal=horrorGoal();
 const near=!t.second&&!t.repair&&dist(player,goal)<42&&visible(player,goal);$('interact').disabled=!near;$('interactionlabel').textContent=near?(!t.battery?'ОБЫСКАТЬ':'ВКЛЮЧИТЬ'):'ДЕЙСТВИЕ';
 if(near&&interactHeld&&!player.moving&&player.hit<=0){if(chapterTwo.active!==goal.id){chapterTwo.active=goal.id;audio.startAction('search');}chapterTwo.hold+=dt;if(chapterTwo.hold>=2.4){chapterTwo.hold=0;chapterTwo.active=null;interactHeld=false;audio.stopAction();if(!t.battery){t.battery=true;audio.play('pickup');showNotice('АККУМУЛЯТОР ИСПРАВЕН · ИДИ К ЩИТОВОЙ');spawnPressure(8,'tunnel');}else if(!t.first){t.first=true;mission.power=true;audio.effect('shelter-click',.3);t.blackout=1.8;audio.effect('park-monster-roar',.35);c2Talk([['МАРК','Слышали? За стеной что-то тяжёлое.'],['ВАНЯ (Я)','Не задерживаемся. Где второй щит?'],['АЛИНА','Дальше по тоннелю, справа. Он откроет выход к депо.']],()=>hud());}else{t.repair={progress:0,waves:0,elapsed:0,worker:null};tunnelWave();showNotice('ПРИКРОЙ НАПАРНИКА · ОН СНИМАЕТ БЛОКИРОВКУ');}hud();}}else if(chapterTwo.hold||chapterTwo.active){chapterTwo.hold=0;chapterTwo.active=null;audio.stopAction();}
 $('interactionbar').style.width=Math.min(100,chapterTwo.hold/2.4*100)+'%';c2Hud();if(t.repair&&!t.second)updateTunnelRepair(dt);
 if(t.second&&!t.arrived&&dist(player,t.nodes[3])<45){t.arrived=true;beginDepotArrival();}
};
const tunnelDrawBase=drawMission;
drawMission=function(){if(chapterTwo?.zone==='depot'){for(let x=104;x<=248;x+=32)questSprite('barricade',x,850,32,22);ctx.fillStyle='#ddc49c';ctx.textAlign='center';ctx.font='bold 10px sans-serif';ctx.fillText('РЕМОНТНОЕ ДЕПО',176,800);return;}if(chapterTwo?.zone!=='tunnel')return tunnelDrawBase();const t=chapterTwo.tunnel;ctx.textAlign='center';ctx.font='bold 8px sans-serif';t.nodes.forEach((p,i)=>{if(i<3)questSprite(i?'generator':'crate',p.x,p.y,26,26);else{ctx.strokeStyle='#cee0a2';ctx.lineWidth=2;ctx.strokeRect(p.x-26,p.y-20,52,38);}ctx.fillStyle='#d8d8b3';ctx.fillText(i===3?(t.second?'ВЫХОД ОТКРЫТ':'ВЫХОД ЗАБЛОКИРОВАН'):p.label,p.x,p.y-34);});};
function beginDepotArrival(){
 music.stop(0);
 allies.forEach(a=>{a.repairSite=null;a.repairing=false;});
 chapterTwo.zone='depot';stage=4;buildMap();stage=2;goalFlows.clear();flow=null;enemies=[];pendingEnemies=[];bullets=[];particles=[];corpses=[];survivors=[];mission.power=false;$('bossbar').classList.add('hidden');player.x=176;player.y=1110;
 allies.filter(a=>a.hp>0).forEach((a,i)=>{const p=safeQuestPoint(112+(i%5)*28,1160+Math.floor(i/5)*22);a.x=p.x;a.y=p.y;});cam=clamp(player.y-viewH*.64,0,H-viewH);
 $('district').textContent='ГЛАВА II / РЕМОНТНОЕ ДЕПО';$('objective').textContent='ВЫБРАЛИСЬ ИЗ ТОННЕЛЯ';$('tasklist').innerHTML='';$('missionhint').textContent='КОМАНДА ДОБРАЛАСЬ ДО ДЕПО';
 c2Talk([['СОНЯ','Воздух… Наконец-то.'],['ВАНЯ (Я)','Все, кто выбрался, держитесь рядом.'],['АЛИНА','Это ремонтное депо. Водитель подгонит грузовик по служебной дороге.'],['МАРК','А ворота?'],['АЛИНА','Заклинило. Здесь есть лебёдка. Только её шум услышит весь пост.']],beginDepotDefense);
}
