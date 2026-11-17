'use strict';
calls.push(
 {title:'ДТП',area:'Площадь у перехода',brief:'Два седана столкнулись у перехода. Осмотрите повреждения, выслушайте водителей и свидетеля.'},
 {title:'Погоня',area:'Северный проспект',brief:'Проверьте водителя красного купе. Если он попытается скрыться, вернитесь в служебную машину и начните преследование.'},
 {title:'Вооружённое нападение',area:'Стоянка у магазинов',brief:'Очевидец сообщает о вооружённом человеке у тёмного внедорожника. Не подходите вплотную: сначала оцените обстановку.'},
 {title:'Угон автомобиля',area:'Двор на Садовой',brief:'Владелец сообщил об угоне светлого универсала. Найдите автомобиль, проверьте водителя и свяжитесь с владельцем.'},
 {title:'Кража со склада',area:'Складской проезд',brief:'У склада загружают коробки в зелёный фургон. Проверьте груз и документы на вывоз.'}
);

function createVehicleCall(index,alternate,api){
 const {npc,entity,route,followPath,distance,converse}=api;
 const actors=[npc],vehicles=[],effects=[];let step,job=null,tick=()=>{},finished=false,shots=0,injured=0,combat=false,exposure=0,shotClock=0;
 const vehicle=(model,x,y,damaged=false)=>{const v={model,x:index===6?roadMotion.lanes().south:(api.parkingX??x),y:index===6?y:Math.max(y,api.yardTop+300),angle:0,frame:damaged?3:0,base:damaged?3:0,target:damaged?3:0,doorClock:0,visible:true,driveAway:false};vehicles.push(v);return v;};
 const place=(a,kind,x,y)=>Object.assign(a,entity(kind,x,y),{visible:true,pose:null,repathTimer:0});
 const civilian=(x,y)=>{x=index===6?x:Math.min(370,api.parkingX+43);const a=place(entity('resident',x,y),'resident',x,y);actors.push(a);return a;};
 const objective=(target,instruction,label,act,range=45)=>{step={target,instruction,label,act,range};};
 const button=(label,act)=>({label,act});
 const wait=(seconds,then)=>{job={left:seconds,then};objective(npc,'ПОДОЖДИ · ОТКРЫВАЕТСЯ ДВЕРЬ','ПОДОЖДИ',()=>{},0);};
 const door=(v,open,rear=false)=>{v.base=rear?3:v.model==='sedan'&&v.damaged?3:0;if(Math.floor(v.frame/3)!==v.base/3)v.frame=v.base;v.target=v.base+(open?2:0);};
 const result=()=>({shots,injured});
 function detain(copy='Водитель доставлен в отдел до дальнейшего выяснения.'){
  finished=true;combat=false;job=null;npc.path=[];npc.pose=index===8?'armedSurrender':null;vehicles.forEach(v=>door(v,false));vehicles.filter((v,i)=>v.visible&&!v.driveAway&&(index!==6||i===1)).forEach(v=>window.towService?.request(v));api.detain(copy,result());
 }
 function release(copy='Водитель отпущен. Проверка на месте завершена.',consequence={}){
  finished=true;combat=false;job=null;vehicles.forEach(v=>door(v,false));api.finish(copy,{...result(),...consequence});
 }
 function choices(title,copy,extra=[],releasedCopy){
  converse(title,copy,[...extra,button('Отпустить',()=>release(releasedCopy)),button('Забрать в отдел',()=>detain())]);
 }
 function exitDriver(v,kind,then){
  npc.visible=false;door(v,true);wait(.55,()=>{place(npc,kind,v.x-26,v.y-12);npc.path=route(npc,v.x-38,v.y+9);wait(.7,()=>{door(v,false);objective(npc,'ПОГОВОРИ С ВОДИТЕЛЕМ','ГОВОРИТЬ',then,40);});});
 }
 function boardAndLeave(v,copy){
  door(v,true);npc.path=route(npc,v.x-25,v.y-9);wait(1,()=>{npc.visible=false;door(v,false);wait(.55,()=>{v.driveAway=true;release(copy);});});
 }
 function footChase(v,then){
  npc.path=route(npc,125,Math.max(120,v.y-145));objective(npc,'ДОГОНИ ВОДИТЕЛЯ ПЕШКОМ','ОСТАНОВИТЬ',()=>{npc.path=[];then();},32);
 }
 function pursuit(v,onStopped){
  npc.visible=false;v.frame=0;v.target=0;v.driveAway=true;v.escapeSpeed=95;v.escapeClock=0;v.escapeStartX=v.x;vehicles.forEach(other=>{if(other!==v)other.visible=false;});
  api.pursue(v,(caught,reason)=>{
   if(!caught){v.visible=false;release(reason==='damage'?'Служебная машина повреждена. Преследование прекращено, ориентировка передана другим экипажам.':'Водитель скрылся. Ориентировка передана другим экипажам.',{escaped:true});return;}
   exitDriver(v,index===8?'armed':'npc',onStopped);
  });
 }

 if(index===6){
  const front=vehicle('sedan',174,345,true);front.damaged=true;
  const rear=vehicle('sedan',179,445);place(npc,'resident',149,410);npc.visible=false;
  const witness=civilian(260,345);const second=civilian(141,335);
  objective({x:rear.x-35,y:380},'ОСМОТРИ ПОВРЕЖДЕНИЯ МАШИН','ОСМОТРЕТЬ',()=>{
   exitDriver(rear,'resident',()=>choices('Водитель седана','— Я не успел затормозить. Но передняя машина тоже резко остановилась.',[
    button('Выслушать второго водителя',()=>objective(second,'ВЫСЛУШАЙ ВТОРОГО ВОДИТЕЛЯ','ГОВОРИТЬ',()=>choices('Второй водитель','— Я пропускал пешехода. Свидетель стоял у перехода.',[
     button('Спросить свидетеля',()=>objective(witness,'ОПРОСИ СВИДЕТЕЛЯ','ГОВОРИТЬ',()=>{
      if(alternate){converse('Попытка скрыться','Свидетель подтверждает нарушение. Виновник пытается уехать.',[button('Начать преследование',()=>{rear.frame=0;pursuit(rear,()=>choices('Водитель остановлен','— Я испугался ответственности. Больше не уеду.'));})]);}
      else choices('Показания свидетеля','— Передний автомобиль пропускал пешехода. Синий седан сзади не выдержал дистанцию.',[button('Оформить ДТП без задержания',()=>release('ДТП оформлено. Водители и свидетель опрошены, пострадавших нет.'))],'Водитель отпущен после опроса. Материалы ДТП переданы на разбор.');
     },40))
    ]),40))
   ]));
  },45);
 }else if(index===7){
  const v=vehicle('coupe',187,595);npc.visible=false;
  const stopped=()=>{choices('Водитель купе','— Я слышал требование остановиться. Пытался скрыться.',[],'Водитель отпущен. Факт неповиновения зафиксирован.');};
  let fled=false;const flee=()=>{if(fled)return;fled=true;pursuit(v,stopped);};
  objective(v,'ПОДОЙДИ К КРАСНОМУ КУПЕ','ПРОВЕРИТЬ ВОДИТЕЛЯ',flee,65);
  tick=player=>{if(!fled&&distance(player,v)<70)flee();};
 }else if(index===8){
  const v=vehicle('suv',171,385);place(npc,'armed',136,363);npc.visible=false;const witness=civilian(263,430);
  function surrendered(){combat=false;npc.pose='armedSurrender';objective(npc,'ОРУЖИЕ ОПУЩЕНО · ПОДОЙДИ','ГОВОРИТЬ',()=>converse('Сдача после нападения','— Всё, сдаюсь. Оружие на земле.',[
   button('Отпустить',()=>release('Освобождённый нападавший позже убил человека. Решение об освобождении привело к новой трагедии.',{dead:1,release:true})),
   button('Забрать в отдел',()=>detain('Нападавший доставлен в отдел. Оружие изъято.'))
  ]),55);}
  const cover={x:api.parkingX+35,y:445};
  function openFire(){
   combat=true;exposure=0;npc.pose='armedShot';npc.face=1;
   objective(cover,'СТРЕЛЬБА · ОТОЙДИ К УКРЫТИЮ','УКРЫТЬСЯ',()=>{
    combat=false;npc.pose='armedIdle';converse('Отряд в укрытии','Машина отделяет отряд от нападавшего. Можно повторить требование о сдаче.',[
     button('Потребовать бросить оружие',surrendered),
     button('Ответить огнём',()=>{shots+=3;window.gunshotAudio?.burst(3,.16);injured=1;npc.pose='armedHurt';wait(.8,surrendered);})
    ]);
   },35);
  }
  const assess=()=>converse('Вооружённый человек','В руке оружие. Свидетель прячется у здания.',[
   button('Потребовать опустить оружие',alternate?surrendered:openFire),
   button('Перекрыть путь к машине',()=>{door(v,true);wait(.5,()=>{door(v,false);openFire();});})
  ]);
  objective(v,'ОЦЕНИ УГРОЗУ С РАССТОЯНИЯ','ОКЛИКНУТЬ',()=>exitDriver(v,'armed',assess),100);
  tick=(player,dt)=>{if(!combat)return;exposure+=dt;shotClock+=dt;if(shotClock>.65){shotClock=0;shots++;window.gunshotAudio?.play();effects.push({x:npc.x+12,y:npc.y-12,tx:player.x,ty:player.y-12,life:.12});}if(exposure>7){injured=1;combat=false;npc.pose='armedIdle';converse('Отряд под огнём','Один сотрудник ранен. Нападавший слышит повторное требование о сдаче.',[button('Принять сдачу',surrendered)]);}};
 }else if(index===9){
  const v=vehicle('wagon',176,355);npc.visible=false;
  const question=()=>choices('Водитель универсала','— Ключи у меня. Хозяин сам разрешил взять машину.',[
   button('Связаться с владельцем',()=>{
    if(alternate)converse('Владелец подтвердил разрешение','— Да, это мой знакомый. Я забыл, что дал ему ключи. Отзываю заявление.',[
     button('Отпустить',()=>boardAndLeave(v,'Владелец подтвердил передачу ключей. Заявление об угоне отозвано.')),
     button('Забрать в отдел',()=>detain('Водитель доставлен в отдел, хотя владелец подтвердил разрешение на поездку.'))
    ]);
    else converse('Угон подтверждён','Владелец никому не давал ключи. Водитель признаётся, что взял машину без разрешения.',[
     button('Отпустить',()=>boardAndLeave(v,'Водитель отпущен при подтверждённом заявлении об угоне. Он уехал на автомобиле.')),
     button('Забрать в отдел',()=>detain('Угон подтверждён владельцем. Водитель доставлен в отдел. Владельца на месте нет: эвакуатор заберёт автомобиль для возврата.'))
    ]);
   })
  ]);
  let fled=false;const approach=()=>{if(fled)return;fled=true;if(alternate)exitDriver(v,'resident',question);else pursuit(v,question);};
  objective(v,'ПОДОЙДИ К СВЕТЛОМУ УНИВЕРСАЛУ','ПОСТУЧАТЬ',approach,60);
  if(!alternate)tick=player=>{if(!fled&&distance(player,v)<65)approach();};
 }else if(index===10){
  const v=vehicle('cargo',174,365);place(npc,'npc',140,353);npc.visible=false;const worker=civilian(258,335);
  function cargoCheck(){door(v,true,true);wait(.6,()=>{objective({x:v.x,y:v.y+45},'ОСМОТРИ ГРУЗ В ФУРГОНЕ','ПРОВЕРИТЬ',()=>{
   converse('Коробки в кузове','На коробках номера склада. Нужно сверить их с накладной.',[button('Проверить накладную у водителя',()=>{door(v,false,true);objective(npc,'ПРОВЕРЬ ДОКУМЕНТЫ НА ГРУЗ','ГОВОРИТЬ',()=>{
    if(alternate)converse('Документы совпали','Накладная действительна, сотрудник склада подтвердил отправку.',[
     button('Отпустить',()=>boardAndLeave(v,'Документы и номера коробок совпали. Законная погрузка продолжена.')),
     button('Забрать в отдел',()=>detain('Водитель доставлен в отдел, несмотря на подтверждённые документы на груз.'))
    ]);
    else choices('Кража подтверждена','Накладная поддельная. Сотрудник склада не разрешал вывоз.',[
     button('Потребовать вернуть коробки',()=>{door(v,true,true);wait(.7,()=>{v.cargo=false;door(v,false,true);choices('Груз возвращён','— Коробки вернул. Больше ничего не трону.',[],'Груз возвращён складу. Нарушитель отпущен с предупреждением.');});})
    ],'Водитель отпущен без подтверждённых документов. Материалы переданы на дальнейшую проверку.');
   },40);})]);
  },40);});}
  objective(v,'ОСТАНОВИ ПОГРУЗКУ У ФУРГОНА','ОКЛИКНУТЬ',()=>exitDriver(v,'npc',()=>choices('Водитель фургона','— Забираю груз по накладной. Коробки в кузове.',[button('Открыть грузовые двери',cargoCheck)])),60);
 }
 return {actors,vehicles,effects,get step(){return step;},get prop(){return null;},get status(){return combat?'ПОД ОГНЁМ':shots?'СТРЕЛЬБА ПРЕКРАЩЕНА':null;},
  animate(dt){
   window.towService?.update(dt);
   for(const v of vehicles){v.doorClock+=dt;if(v.doorClock>=.22&&v.frame!==v.target){v.frame+=Math.sign(v.target-v.frame);v.doorClock=0;}if(v.driveAway){
    if(!v.exitRoute){const start={x:v.x,y:v.y},reverse=v.x<192,merge={x:roadMotion.lanes().north,y:v.y+(reverse?160:-160)};v.exitRoute=roadMotion.path(roadMotion.bend(start,merge,reverse),roadMotion.line(merge,{x:merge.x,y:-150}));v.exitId='leaving-'+v.model;roadMotion.reserve(v.exitId);}
    if(roadMotion.ready(v,v.exitRoute))v.exitStarted=true;
    if(v.escapeSpeed&&v.exitRoute.at>=v.exitRoute.length-.01){v.y-=v.escapeSpeed*dt;v.angle=0;}else if(v.exitStarted&&roadMotion.advance(v,v.exitRoute,dt,v.escapeSpeed||80)){if(!v.escapeSpeed)v.visible=false;roadMotion.release(v.exitId);}
   }}

   for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}
   if(job){job.left-=dt;if(job.left<=0){const cb=job.then;job=null;cb();}}
  },
  update(player,dt){if(!finished)tick(player,dt);for(const a of actors)followPath(a,dt,a===npc?76:60);}
 };
}
