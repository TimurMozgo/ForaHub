'use strict';
calls.push(
 {title:'Ночное ограбление',area:'Торговый двор',brief:'Вооружённая группа грабит магазин. Отряд прибывает вместе. Прикажите бросить оружие; при нападении используйте укрытия и защитите сотрудников.'},
 {title:'Стрельба во дворе',area:'Двор на Липовой',brief:'Во дворе стреляют, рядом жители. Остановите нападающих и прикройте отход мирных людей. Сдавшегося доставьте в отдел.'},
 {title:'Засада после погони',area:'Промышленный квартал',brief:'Проверьте подозрительное купе. Водитель может скрыться. После остановки не теряйте осторожность: рядом могут быть сообщники.'}
);
window.combatGeometry={hit(a,b,r){let lo=0,hi=1;for(const [p,d,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]){if(Math.abs(d)<1e-8){if(p<min||p>max)return null;}else{let u=(min-p)/d,v=(max-p)/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}}return lo>=0&&lo<=1?lo:null;}};
function createNightCall(index,alternate,api){
 const {npc,entity,route,followPath,player,bots,car}=api,squad=[player,...bots],effects=[],actors=[],vehicles=[],covers=[];
 let mode=index===13?'approach':'assess',step,shots=0,dead=0,clock=0,selected=0,coverClock=0,sign=-1,ended=false;
 let playerShots=0,supportFire=false,refusal=0;const support=[],responders=[];let servicesCalled=false,treated=false;
 const distance=api.distance,alive=a=>a.hp>0,objective=(target,instruction,label,act,range=60)=>step={target,instruction,label,act,range};
 function vehicle(model,x,y){const v={model,x,y,angle:0,frame:0,visible:true};vehicles.push(v);return v;}
 function enemy(x,y,i){const e=i===0?npc:entity('armed',x,y);Object.assign(e,{kind:'armed',x,y,visible:true,path:[],pose:'armedIdle',hp:index===11?100:60,maxHp:index===11?100:60,cooldown:.9+i*.3,enemy:true,peek:0});actors.push(e);return e;}
 function layout(center=480,reverse=false){sign=reverse?1:-1;covers.length=0;
  for(const [i,x] of [260,310,350].entries())covers.push({key:i===1?'object12':'object33',x,y:center+(i===1?18:0),w:28,h:24,slot:{x:x+14,y:center+(i===1?18:0)+(reverse?-15:42)}});
 }
 function blockers(){return [...api.fixed(),...covers,...[car,...vehicles.filter(v=>v.visible)].map(v=>({x:v.x-28,y:v.y-43,w:56,h:86}))];}
 function trace(a,b){let best=1;for(const r of blockers()){const t=combatGeometry.hit(a,b,r);if(t!==null)best=Math.min(best,t);}return best;}
 function coverFor(p){return covers.find(c=>distance(p,c.slot)<17);}
 function origin(p){const c=coverFor(p);return c&&p.peek>0?{x:p.x,y:sign<0?c.y-7:c.y+c.h+7}:{x:p.x,y:p.y};}
 function options(){return actors.filter(a=>a.enemy&&a.visible&&alive(a));}
 function impact(a,b,color){const t=trace(a,b);effects.push({x:a.x,y:a.y-12,tx:a.x+(b.x-a.x)*t,ty:a.y+(b.y-a.y)*t-12,life:.1,color});window.gunshotAudio?.play();return t>=.999;}
 function stats(){return {shots,neutralized:dead,injured:squad.filter(p=>p.hp<100).length,officersDown:squad.filter(p=>!alive(p)).length,civilianDead:actors.filter(a=>a.civilian&&!alive(a)).length,health:squad.map(p=>p.hp)};}
 function restoreSquad(){for(const p of squad){p.pose=null;p.peek=0;p.path=[];if(!alive(p))p.visible=false;}}
 function end(copy,failed=false,extra={}){if(ended)return;ended=true;mode='done';restoreSquad();const result={...stats(),failed,...extra};copy+=' Сотрудники: '+squad.map((p,i)=>(i?'Напарник '+i:'Вы')+' '+Math.ceil(p.hp)+'/100').join(' · ')+'.';if(result.officersDown)copy+=' Тяжелораненые эвакуированы.';if(failed)api.fail(copy,result);else api.finish(copy,result);}
 function surrender(e){mode='surrender';restoreSquad();if(e!==npc){Object.assign(npc,e);e.visible=false;if(!actors.includes(npc))actors.push(npc);}npc.enemy=false;npc.pose='armedSurrender';npc.path=[];
  objective(npc,'ПОСЛЕДНИЙ НАПАДАВШИЙ СДАЛСЯ','ГОВОРИТЬ',()=>api.converse('Оружие на земле','— Всё, сдаюсь. Не стреляйте.',[
   {label:'Забрать в отдел',act:()=>{ended=true;mode='done';api.detain('Сдавшийся нападавший доставлен в отдел. Остальные угрозы устранены.',stats());}},
   {label:'Отпустить',act:()=>end('Сдавшийся отпущен после изъятия оружия. Материалы переданы следствию.')}
  ]),60);
 }
 function shoot(p,isPlayer=false){if(mode!=='combat'||!alive(p)||(isPlayer&&index===11&&!supportFire)||(p.cooldown||0)>0)return false;p.peek=.42;
  const from=origin(p),targets=options();let e=targets[selected%Math.max(1,targets.length)];if(!e||distance(from,e)>=340||trace(from,e)<.999)e=targets.find(t=>trace(from,t)>=.999&&distance(from,t)<340);
  if(!e){p.peek=0;return false;}selected=targets.indexOf(e);p.cooldown=isPlayer?(index===11?.75:.45):(p.support?2.8:1.65);p.pose=p.kind+'Shot';p.face=e.x<p.x?-1:1;shots++;if(isPlayer)playerShots++;
  if(impact(from,origin(e),'#f7d68a')){e.hp=Math.max(0,e.hp-(isPlayer?(index===11?18:30):(index===11?6:12)));if(!alive(e)){e.pose='armedDead';e.path=[];dead++;}}
  const remaining=options();if(!remaining.length){if(index===11)aftermath();else end('Нападение остановлено. Все вооружённые угрозы устранены.');}else if(index===12&&remaining.length===1&&remaining[0].hp<=30)surrender(remaining[0]);return true;
 }
 function takeCover(p=player,i=-1){if(mode!=='combat'||!alive(p))return;const choices=covers.filter(c=>!bots.some(b=>b!==p&&alive(b)&&b.cover===c));const c=i>=0?covers[i]:choices.sort((a,b)=>distance(p,a.slot)-distance(p,b.slot))[0];if(!c)return;p.cover=c;p.path=route(p,c.slot.x,c.slot.y);}
 function begin(){if(mode==='combat')return;mode='combat';coverClock=0;for(const p of squad){p.cooldown=0;p.peek=0;p.path=[];}bots.forEach((b,i)=>takeCover(b,i+1));
  objective(player,index===11?'БАНДИТЫ ОТКРЫЛИ ОГОНЬ · ДАЙ КОМАНДУ ПОДДЕРЖКЕ':'АВТООГОНЬ · ЗАЙМИ УКРЫТИЕ',index===11?'ОТКРЫТЬ ОГОНЬ':'ДРУГАЯ ЦЕЛЬ',()=>{if(index===11&&!supportFire){supportFire=true;objective(player,'АВТООГОНЬ · ОТРЯД И ПОДДЕРЖКА ВЕДУТ ОГОНЬ','ДРУГАЯ ЦЕЛЬ',()=>{selected++;},Infinity);}else selected++;},Infinity);
 }
 function assess(){if(index===11){mode='refusal';refusal=2.5;objective(player,'ПОЛИЦИЯ! БРОСИТЬ ОРУЖИЕ!','ОЖИДАНИЕ ОТВЕТА',()=>{},0);return;}api.converse('Полиция! Бросить оружие!','Отряд занимает позиции. Нападающие отказываются сдаваться и направляют оружие на сотрудников.',[{label:'Укрыться и вступить в бой',act:()=>{begin();takeCover();}}]);}
 if(index!==13){layout(index===11?480:530);const base=index===11?350:395;enemy(268,base,0);enemy(310,base-25,1);enemy(355,base+15,2);vehicle(index===11?'cargo':'suv',350,base-60);
  if(index===12)for(let i=0;i<2;i++){const a=entity('resident',365,base+70+i*35);Object.assign(a,{visible:true,civilian:true,hp:60,pose:'armedSurrender'});actors.push(a);}
  objective({x:245,y:index===11?580:630},'ОТРЯД НА МЕСТЕ · ПРИКАЖИ СДАТЬСЯ','СДАТЬСЯ!',assess,105);
 }else{const v=vehicle('coupe',315,510);npc.visible=false;let fled=false;
  objective(v,'ПРОВЕРЬ ВОДИТЕЛЯ КУПЕ','ПРОВЕРИТЬ',()=>{},70);
  const flee=()=>{if(fled)return;fled=true;mode='escape';v.driveAway=true;v.escapeClock=0;roadMotion.reserve('ambush-driver');
   api.pursue(v,(caught)=>{v.driveAway=false;if(!caught){end('Автомобиль скрылся. Ориентировка передана другим экипажам.',false,{escaped:true});return;}
    layout(car.y+105,true);enemy(310,car.y+220,0);enemy(335,car.y+260,1);enemy(365,car.y+230,2);vehicle('suv',350,Math.min(890,car.y+350));
    mode='assess';objective({x:car.x+38,y:car.y+55},'ВПЕРЕДИ СООБЩНИКИ · ОСТОРОЖНО','ОКЛИКНУТЬ',()=>{api.converse('Засада во дворе','Водитель присоединился к вооружённым сообщникам. Они открывают огонь.',[{label:'Занять укрытия',act:()=>{begin();takeCover();}}]);},85);
   });};step.act=flee;
 }

 // Reinforcements use the same road geometry and collision checks as patrol cars.
 function inbound(model,x,y,serviceSprite){const v=vehicle(model,roadMotion.lanes().north,1140);Object.assign(v,{visible:false,police:serviceSprite===undefined,serviceSprite,destination:{x,y},arrived:false});return v;}
 function arrival(v,dt){if(v.arrived)return;v.visible=true;if(!v.route){const entry={x:roadMotion.lanes().north,y:v.destination.y+340};v.route=roadMotion.path(roadMotion.line(v,entry),roadMotion.bend(entry,v.destination));}if(roadMotion.advance(v,v.route,dt,95)){v.arrived=true;v.doorTime=0;} }
 function member(v,i,serviceSprite){const a=entity(serviceSprite===undefined?'p'+(i%3+1):'resident',v.x+(i%2?34:-34),v.y+12);Object.assign(a,{visible:true,support:serviceSprite===undefined,serviceSprite,path:[]});actors.push(a);return a;}
 let witness;
 if(index===11){roadMotion.reserve('robbery-scene');for(let n=0;n<4;n++){const cx=248+n*36;covers.push({key:'object33',x:cx-12,y:552,w:24,h:16,slot:{x:cx,y:590}});}
  const v1=inbound('sedan',340,650),v2=inbound('hatchback',340,770);v1.supportCar=v2.supportCar=true;
  witness=entity('resident',368,410);Object.assign(witness,{visible:false,hp:60,civilian:true,safe:true,pose:'armedSurrender'});actors.push(witness);
 }
 function aftermath(){if(mode!=='combat')return;mode='secure';restoreSquad();for(const a of support){a.pose=null;a.path=[];}
  witness.visible=true;objective(witness,'УГРОЗ НЕТ · ПРОВЕРЬ СОТРУДНИКА МАГАЗИНА','ПРОВЕРИТЬ',()=>api.converse('Сотрудник магазина','— Я спрятался за прилавком. Их водитель уехал до вашего приезда. Камера у входа записала машину. Нужен врач: меня задело стеклом.',[{label:'Вызвать скорую и следственную группу',act:()=>{servicesCalled=true;mode='services';roadMotion.reserve('robbery-scene');inbound('van',340,890,0);inbound('van',270,960,1);objective({x:295,y:710},'СЛУЖБЫ В ПУТИ · ОБЕСПЕЧЬ ПРОХОД','ОЖИДАЕМ СЛУЖБЫ',()=>{},0);}}]),60);
 }
 function sceneTick(dt){if(index!==11)return;
  const patrols=vehicles.filter(v=>v.supportCar);for(let i=0;i<patrols.length;i++){const v=patrols[i];if(car.y>1000||(i&&!patrols[i-1].arrived))continue;arrival(v,dt);if(v.arrived){v.doorTime+=dt;v.frame=v.doorTime<.3?1:v.doorTime<1.8?2:v.doorTime<2.1?1:0;if(!v.crew&&v.doorTime>.5){v.crew=true;for(let j=0;j<2;j++){const a=member(v,j);support.push(a);squad.push(a);const n=support.length-1;const cx=248+n*36;a.post={x:cx,y:590};a.cover=covers.find(c=>c.slot.x===cx&&c.slot.y===590);a.path=route(a,a.post.x,a.post.y);}}}}
  for(const a of support){if(a.hp<=0)continue;followPath(a,dt,82);if(mode==='combat'&&supportFire&&!a.path.length){const fired=shoot(a);a.blocked=(fired||a.cooldown>0)?0:(a.blocked||0)+dt;if(a.blocked>4){a.blocked=0;const i=support.indexOf(a);a.path=route(a,242+i*40,430);}} }
  if(patrols.every(v=>v.arrived)&&!servicesCalled)roadMotion.release('robbery-scene');
  const services=vehicles.filter(v=>v.serviceSprite!==undefined);for(let i=0;i<services.length;i++){const v=services[i];if(i&&!services[i-1].arrived)continue;arrival(v,dt);if(v.arrived&&!v.crew){v.crew=true;for(let j=0;j<2;j++){const a=member(v,j,v.serviceSprite===0?2:3);responders.push(a);a.post=v.serviceSprite===0?{x:344+j*25,y:430}:{x:300+j*28,y:580};a.path=route(a,a.post.x,a.post.y);}}}
  for(const a of responders)followPath(a,dt,82);
  if(mode==='services'&&responders.length===4&&responders.every(a=>distance(a,a.post)<12)){mode='handover';treated=true;for(const a of squad)if(a.hp>0)a.hp=Math.min(100,a.hp+35);const investigator=responders.find(a=>a.serviceSprite===3);objective(investigator,'МЕДИКИ ПОМОГАЮТ · ПЕРЕДАЙ ЗАПИСЬ СЛЕДОВАТЕЛЮ','ПЕРЕДАТЬ МАТЕРИАЛЫ',()=>api.converse('Следователь принимает место','— Сотрудник магазина в безопасности. На записи виден автомобиль сообщника. Мы изымем оружие и запись, а экипажам передадим ориентировку. Ваш отряд может возвращаться.',[{label:'Передать запись и завершить операцию',act:()=>{try{localStorage.setItem('patrol-rush-robbery-lead',JSON.stringify({vehicle:'светлый универсал',status:'разыскивается'}));}catch{}end('Магазин освобождён. Пострадавшему оказана помощь. Место и запись переданы следственной группе. Водитель сообщников объявлен в розыск.',false,{supportCars:2,servicesArrived:true,evidenceTransferred:true});}}]),65);}
 }

 return{actors,vehicles,effects,covers,get step(){return step;},get controlsSquad(){return mode==='combat';},get combat(){return mode==='combat';},get status(){if(index===11&&['secure','services','handover'].includes(mode))return mode==='secure'?'ОСМОТР МЕСТА':mode==='services'?'СЛУЖБЫ В ПУТИ':'МЕСТО ПОД ОХРАНОЙ';return mode==='combat'?'УГРОЗЫ '+options().length+' · УКРЫТИЕ '+(coverFor(player)&&player.peek<=0?'ДА':'НЕТ'):null;},takeCover,shoot:()=>shoot(player,true),cycle(){selected++;},
  snapshot:()=>({mode,shots,playerShots,autoFire:mode==='combat'&&(index!==11||supportFire),dead,supportFire,support:support.map(a=>({hp:a.hp,x:a.x,y:a.y})),servicesCalled,treated,responders:responders.length,enemies:options().map(e=>({x:e.x,y:e.y,hp:e.hp})),health:squad.map(p=>p.hp),covered:!!coverFor(player)&&player.peek<=0,civilians:actors.filter(a=>a.civilian).map(a=>({hp:a.hp,safe:a.safe})),covers}),
  animate(dt){clock+=dt;sceneTick(dt);for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}for(const v of vehicles)if(v.driveAway){if(!v.exitRoute){const merge={x:roadMotion.lanes().north,y:v.y-170};v.exitRoute=roadMotion.path(roadMotion.bend(v,merge),roadMotion.line(merge,{x:merge.x,y:-150}));}if(v.exitRoute.at>=v.exitRoute.length-.01)v.y-=105*dt;else {if(!v.exitStarted&&roadMotion.ready(v,v.exitRoute))v.exitStarted=true;if(v.exitStarted)roadMotion.advance(v,v.exitRoute,dt,105);}}},
  update(p,dt){if(index===11&&mode==='refusal'){refusal-=dt;if(refusal<=0){begin();takeCover();}}if(index===13&&mode==='approach'&&distance(p,vehicles[0])<75)step.act();if(mode!=='combat')return;
   for(const a of new Set([...squad,...actors])){a.cooldown=Math.max(0,(a.cooldown||0)-dt);a.peek=Math.max(0,(a.peek||0)-dt);if(squad.includes(a)&&a.peek===0&&alive(a))a.pose=null;}
   for(const a of actors.filter(a=>a.civilian&&alive(a)&&!a.safe)){if(!a.path.length)a.path=route(a,365,820);followPath(a,dt,65);if(a.y>790){a.safe=true;a.visible=false;}}
   if(index!==11||supportFire)shoot(player,true);
   if(mode!=='combat')return;
   bots.forEach((b,i)=>{if(!alive(b))return;if(b.cover&&distance(b,b.cover.slot)>8){if(!b.path.length)b.path=route(b,b.cover.slot.x,b.cover.slot.y);followPath(b,dt,100);}else if(index!==11||supportFire)shoot(b);});
   if(mode!=='combat')return;
   for(const e of options()){if(e.cooldown>0)continue;e.cooldown=1.1;const potential=[...squad,...actors.filter(a=>a.civilian&&!a.safe)].filter(a=>a.visible&&alive(a)&&distance(a,e)<350);potential.sort((a,b)=>distance(a,e)-distance(b,e));const target=potential.find(a=>trace(e,origin(a))>=.999)||potential[0];if(!target)continue;e.pose='armedShot';e.face=target.x<e.x?-1:1;shots++;if(impact(e,origin(target),'#ff8c65')){target.hp=Math.max(0,target.hp-8);target.hurt=.2;if(!alive(target)){target.pose=target.enemy?'armedDead':target.civilian?'armedHurt':target.kind+'Hurt';target.path=[];}}
   }
   if(!alive(player))end('Вы тяжело ранены. Отряд прекратил операцию, вызвано подкрепление.',true);
  },
  draw(g){if(index===11){g.font='7px monospace';g.textAlign='center';for(const v of vehicles.filter(v=>v.visible&&(v.police||v.serviceSprite!==undefined))){g.fillStyle='#c9d4bf';g.fillText(v.serviceSprite===0?'СКОРАЯ':v.serviceSprite===1?'СЛЕДСТВИЕ':'ПОДДЕРЖКА',v.x,v.y+53);}if(treated){g.fillStyle='#a9d8b4';g.fillText('ПОМОЩЬ ОКАЗАНА',350,452);}}if(mode!=='combat'&&mode!=='surrender')return;const targets=options(),aim=targets[selected%Math.max(1,targets.length)];if(aim){g.strokeStyle='#efbd70';g.lineWidth=1;g.strokeRect(aim.x-13,aim.y-30,26,33);}for(const c of covers){g.strokeStyle='#86b9b0';g.lineWidth=1;g.beginPath();g.ellipse(c.slot.x,c.slot.y,10,4,0,0,Math.PI*2);g.stroke();}
   for(const a of [...new Set([...squad,...actors])].filter(a=>a.visible&&a.hp!==undefined)){g.fillStyle='#17201b';g.fillRect(a.x-12,a.y-33,24,4);g.fillStyle=a.enemy?'#db785e':a.hp<35?'#e28a58':'#9cbd83';g.fillRect(a.x-12,a.y-33,24*a.hp/(a.maxHp||(a.civilian?60:100)),3);}
  }
 };
}


