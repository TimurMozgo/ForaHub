'use strict';
function tunnelWave(){const n=Math.min(20,8+allies.filter(a=>a.hp>0).length);spawnPressure(n,'tunnel-defense');entryDelay=.5;}
function tunnelWorker(){const r=chapterTwo?.zone==='tunnel'&&chapterTwo.tunnel.repair;if(!r||chapterTwo.tunnel.second)return null;if(!r.worker||r.worker.hp<=0)r.worker=allies.filter(a=>a.hp>0).sort((a,b)=>dist(a,chapterTwo.tunnel.nodes[2])-dist(b,chapterTwo.tunnel.nodes[2]))[0]||null;return r.worker;}
const tunnelBuildersBase=assignCheckpointBuilders;
assignCheckpointBuilders=function(){if(chapterTwo?.zone!=='tunnel'||!chapterTwo.tunnel.repair||chapterTwo.tunnel.second)return tunnelBuildersBase();const worker=tunnelWorker();allies.forEach(a=>{a.building=false;a.repairSite=a===worker?'tunnel-switch':null;a.repairing=a===worker&&dist(a,chapterTwo.tunnel.nodes[2])<28;});};
const tunnelPostBase=checkpointAllyGoal;
checkpointAllyGoal=function(a,i){if(chapterTwo?.zone==='tunnel'&&a===tunnelWorker())return chapterTwo.tunnel.nodes[2];return tunnelPostBase(a,i);};
function updateTunnelRepair(dt){
 const t=chapterTwo.tunnel,r=t.repair,worker=tunnelWorker(),operator=worker||player,point=t.nodes[2];r.elapsed+=dt;
 if(r.waves<2&&r.elapsed>6+r.waves*7){r.waves++;tunnelWave();}
 const danger=enemies.some(e=>e.hp>0&&dist(e,operator)<58),near=dist(operator,point)<28,cover=dist(player,point)<190;
 if(!worker){$('interact').disabled=dist(player,point)>=42;$('interactionlabel').textContent='СНЯТЬ БЛОК';}
 const working=near&&cover&&!danger&&operator.hit<=0&&(worker||interactHeld&&!player.moving);
 if(working)r.progress=Math.min(18,r.progress+dt);
 $('missionhint').textContent=(danger?'ЗОМБИ У ЩИТА · ПРИКРОЙ!':!cover?'ВЕРНИСЬ И ПРИКРОЙ НАПАРНИКА':!near?'НАПАРНИК ИДЁТ К ЩИТУ':worker?worker.name+' СНИМАЕТ БЛОКИРОВКУ':'УДЕРЖИВАЙ ДЕЙСТВИЕ У ЩИТА')+' · '+Math.floor(r.progress)+'/18 СЕК';
 $('interactionbar').style.width=r.progress/18*100+'%';
 if(r.progress<18)return;t.second=true;mission.power=false;t.blackout=1.5;allies.forEach(a=>{a.repairSite=null;a.repairing=false;});audio.effect('shelter-click',.3);
 pendingEnemies.unshift({...actor(176,1000,4),boss:true,hp:850,maxHp:850,speed:36,phase:'approach',timer:0,attack:0,slam:0});total++;tunnelWave();showNotice('ВЫХОД ОТКРЫТ · ОТХОДИМ! ГРОМИЛА ИДЁТ СЗАДИ');
}
// Deliver attacks at opposite offscreen ends. Never create enemies in the player's view.
const tunnelSpawnBase=spawnEdgeEnemies;
spawnEdgeEnemies=function(dt){if(chapterTwo?.zone!=='tunnel')return tunnelSpawnBase(dt);if(!pendingEnemies.length||enemies.filter(e=>e.hp>0).length>=24)return;entryDelay-=dt;if(entryDelay>0)return;
 const t=chapterTwo.tunnel;t.entry=(t.entry||0)+1;
 for(let i=0;i<2&&pendingEnemies.length;i++){const e=pendingEnemies[0],below=e.boss||t.entry%2===0;let x=[120,176,232][(t.entry+i)%3],y=below?cam+viewH+48:cam-48,entryY;
 if(below&&y>H-35){y=cam-48;entryY=Math.max(80,cam+10);}else if(!below)entryY=Math.max(80,cam+10);
 if(blocked(x,entryY??y,12)||dist({x,y},player)<140)continue;pendingEnemies.shift();e.x=x;e.y=y;e.entryY=entryY;e.enteringRound=true;e.attack=1;enemies.push(e);}
 entryDelay=1.1;
};
