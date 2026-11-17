'use strict';
// Station transit uses its own scene while retaining the existing call simulation.
window.stationBase=(()=>{
 const panel=document.createElement('section');panel.id='station-base';panel.hidden=true;
 panel.innerHTML='<canvas aria-label="Полицейский участок"></canvas><header><b>• ПОЛИЦИЯ</b><button id="base-pause" aria-label="Пауза">Ⅱ</button><p id="base-location"></p><small>ОТРЯД · 3 / 3</small><p id="base-hint"></p></header><button id="base-action"></button><button id="base-garage">АВТОПАРК</button><button id="base-skip" hidden>ПРОПУСТИТЬ ВЫЕЗД</button>';
 document.querySelector('#app').append(panel);
 const pausePanel=document.createElement('div');pausePanel.id='base-pause-panel';pausePanel.hidden=true;pausePanel.innerHTML='<article class="card"><span class="small-label">ДЕЖУРСТВО ПРИОСТАНОВЛЕНО</span><h2>ПАУЗА</h2><p>Движение и события остановлены.</p></article>';pausePanel.querySelector('article').append(panel.querySelector('#base-action'));panel.append(pausePanel);
 const cv=panel.querySelector('canvas'),ctx=cv.getContext('2d'),button=panel.querySelector('#base-action'),hint=panel.querySelector('#base-hint'),locationLabel=panel.querySelector('#base-location');
 const assets={},files={yard:'street-assets/station-yard-fleet.png',car:'street-assets/sedan-doors.png',room:'assets/room.png',table:'assets/table.png',chair_front:'assets/chair_front.png',chair_side:'assets/chair_side.png',tv:'assets/tv.png',cup:'assets/cup.png',teapot:'assets/teapot.png'};
 files.uniform='assets/officers-directions-v3.png';
 files.detaineeIdle='street-assets/suspect/Idle.png';files.detaineeWalk='street-assets/suspect/Walk.png';files.custodyRoom='assets/room-custody.png';files.interior='assets/station-interior-v3.png';
 for(const car of fleet.catalog)files['car_'+car.id]='street-assets/'+car.file;
 for(let i=1;i<=3;i++){files['seat'+i]='animations/officer_'+i+'.png';for(const a of ['Idle','Walk'])files['p'+i+a]='street-assets/police/'+i+'-'+a+'.png';}
 let state='waiting',elapsed=0,loaded=false,paused=false,last=0,done=null,request=null,returning=false,hasDetainee=false,doorOpen=0;
 let dispatchDelay=0,cellDoor=0,cellOccupied=false;const detainee={x:0,y:0,visible:false,moving:false};
 const roomStates=['gearEquip','gearUnequip','gearExit','restEnter','booking','custodyCell','cellExit','custodyEnter','cellLock','incoming','waiting','readyExit','roomExit','roomEnter','roomReturn'];
 const people=[{x:192,y:321},{x:146,y:365},{x:238,y:365}],vehicle={x:117,y:402,angle:Math.PI,frame:0};
 function phase(next){state=next;elapsed=0;if(roomStates.includes(next))stationInterior.enter(next,people,detainee);ui();}
 panel.querySelector('#base-garage').onclick=()=>fleet.open();
 window.addEventListener('fleetchange',()=>ui());
 panel.querySelector('#base-skip').onclick=()=>{if(returning||!['roomExit','gearEquip','gearExit','yardExit','approachCar','boarding','driveOut'].includes(state))return;people.forEach(p=>{p.equipped=true;p.gearBlend=1;});complete();window.street?.skipArrival?.();};
 function ui(){
  pausePanel.hidden=!paused;
  panel.querySelector('#base-skip').hidden=paused||returning||!['roomExit','gearEquip','gearExit','yardExit','approachCar','boarding','driveOut'].includes(state);
  panel.querySelector('#base-garage').hidden=paused||!loaded||!['waiting','readyExit'].includes(state);
  panel.querySelector('#base-garage').textContent='АВТОПАРК · '+fleet.snapshot().balance;
  locationLabel.textContent=roomStates.includes(state)?'ПОЛИЦЕЙСКИЙ УЧАСТОК · '+patrolShift.label():'УЧАСТОК / ВНУТРЕННИЙ ДВОР';
  const hints={gearEquip:'НАДЕВАЕМ ЭКИПИРОВКУ',gearUnequip:'СНИМАЕМ ЭКИПИРОВКУ',gearExit:'ЭКИПИРОВАНЫ · ИДЁМ К МАШИНЕ',restEnter:'ВОЗВРАЩАЕМСЯ В КОМНАТУ ОТДЫХА',booking:'ДЕЖУРНЫЙ · ОФОРМЛЯЕМ ЗАДЕРЖАННОГО',custodyCell:'ПРОВОДИМ ЗАДЕРЖАННОГО В КАМЕРУ',cellExit:'СОТРУДНИК ВЫХОДИТ · ЗАДЕРЖАННЫЙ ОСТАЁТСЯ',custodyEnter:'СОПРОВОЖДАЕМ ЗАДЕРЖАННОГО В КАМЕРУ',cellLock:'ЗАДЕРЖАННЫЙ В КАМЕРЕ · ЗАКРЫВАЕМ ДВЕРЬ',waiting:'ОТРЯД ЖДЁТ ЗАЯВКУ',incoming:'ДИСПЕТЧЕР · ПОСТУПИЛА ЗАЯВКА',roomExit:'ИДЁМ В КОМНАТУ СНАРЯЖЕНИЯ',yard:'СЛУЖЕБНЫЙ АВТОМОБИЛЬ СЛЕВА',approachCar:'ИДЁМ К СЛУЖЕБНОЙ МАШИНЕ',boarding:'ОТРЯД САДИТСЯ В МАШИНУ',driveOut:'ВЫЕЗЖАЕМ ЧЕРЕЗ ВОРОТА',driveIn:'ВОЗВРАЩАЕМСЯ НА ТЕРРИТОРИЮ УЧАСТКА',unload:hasDetainee?'ДОСТАВКА ЗАДЕРЖАННОГО · ОТРЯД ВЫХОДИТ':'ОТРЯД ВЫХОДИТ ИЗ МАШИНЫ',walkIn:'ВОЗВРАЩАЕМСЯ В КОМНАТУ',roomReturn:'ОТРЯД ВЕРНУЛСЯ'};
  Object.assign(hints,{readyExit:'ЗАЯВКА ПРИНЯТА · ВЫХОД ЧЕРЕЗ ДВЕРЬ СПРАВА',yardExit:'ОТРЯД ВЫХОДИТ ЧЕРЕЗ ДВЕРЬ',roomEnter:'ВОЗВРАЩАЕМ СНАРЯЖЕНИЕ'});
  hint.textContent=loaded?(paused?'ПАУЗА':hints[state]):'ЗАГРУЖАЕМ УЧАСТОК…';
  button.textContent=paused?'ПРОДОЛЖИТЬ':state==='readyExit'?'К ДВЕРИ':state==='yard'?'СЕСТЬ В МАШИНУ':'ПОДОЖДИ';
  button.hidden=!paused;
  button.disabled=!loaded||(!paused&&!['readyExit','yard'].includes(state));
 }
 function resetPeople(){stationInterior.reset(people);}
 function show(onRequest){detainee.visible=false;request=onRequest;dispatchDelay=6+Math.random()*4;done=null;returning=false;hasDetainee=false;paused=false;resetPeople();panel.hidden=false;phase('waiting');}
 function depart(callback){detainee.visible=false;done=callback;returning=false;doorOpen=0;resetPeople();paused=false;phase('roomExit');}
 function arrive(detained,callback){done=callback;hasDetainee=detained;detainee.visible=false;cellDoor=0;returning=true;paused=false;panel.hidden=false;people.forEach(p=>p.visible=false);phase('driveIn');}
 function act(){if(!loaded)return;if(paused){paused=false;ui();return;}if(state==='readyExit')phase('roomExit');else if(state==='yard')phase('boarding');}
 button.onclick=act;
 panel.querySelector('#base-pause').onclick=()=>{paused=!paused;ui();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!panel.hidden){paused=true;ui();}});
 window.addEventListener('keydown',e=>{if(fleet.isOpen()||panel.hidden||!document.querySelector('#briefing').hidden)return;if(['e','у',' '].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)act();}if(e.key==='Escape'){e.stopImmediatePropagation();paused=!paused;ui();}},true);
 function sprite(key,sx,sy,sw,sh,x,y,w,h){ctx.drawImage(assets[key],sx,sy,sw,sh,x,y,w,h);}
 function prop(key,x,y,w,h){const f=window.SPRITES.assets[key].frames[0];sprite(key,...f,x,y,w,h);}
 // Each identity owns a row: front/back/profile walk pairs, front/profile seated.
 function uniform(identity,frame,x,y,height=38,flip=false){const im=assets.uniform;
  if(!im.regions){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const cg=c.getContext('2d');cg.drawImage(im,0,0);const data=cg.getImageData(0,0,im.width,im.height).data;im.regions=[];
   for(let row=0;row<4;row++)for(let col=0;col<8;col++){
    const sx=Math.round(col*im.width/8),sy=Math.round(row*im.height/4),w=Math.round((col+1)*im.width/8)-sx,h=Math.round((row+1)*im.height/4)-sy,seen=new Uint8Array(w*h);let best=null;
    // Find the figure rather than isolated transparent-edge specks in the atlas.
    for(let i=0;i<w*h;i++){if(seen[i]||data[((sy+Math.floor(i/w))*im.width+sx+i%w)*4+3]<220)continue;let queue=[i],head=0,l=w,r=0,t=h,b=0;seen[i]=1;
     while(head<queue.length){const at=queue[head++],xx=at%w,yy=Math.floor(at/w);l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);for(const [nx,ny]of [[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]]){if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(seen[j]||data[((sy+ny)*im.width+sx+nx)*4+3]<220)continue;seen[j]=1;queue.push(j);}}
     if(!best||queue.length>best.count)best={count:queue.length,l,r,t,b};
    }
    im.regions.push(best?[sx+best.l,sy+best.t,best.r-best.l+1,best.b-best.t+1]:[sx,sy,w,h]);
   }
  }
  const crop=im.regions[identity*8+frame],width=height*crop[2]/crop[3];ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(im,...crop,-width/2,-height,width,height);ctx.restore();
 }
 function seated(i,x,y){uniform(i,i===0?6:7,x,y,36,i===2);}
 function person(i,p,moving=true){if(!p.visible)return;const blend=roomStates.includes(state)?(p.gearBlend??(p.equipped?1:0)):1;
  if(blend<1){const dir=p.heading||'down',frame=(dir==='up'?2:dir==='left'||dir==='right'?4:0)+(moving?Math.floor((p.gait||0)/8)%2:0);ctx.save();ctx.globalAlpha=1-blend;uniform(i,frame,p.x,p.y,38,dir==='left');ctx.restore();}
  if(blend<=0)return;ctx.save();ctx.globalAlpha=blend;const key='p'+(i+1)+(moving?'Walk':'Idle'),a=assets[key],f=Math.floor(elapsed/(moving?.13:.3))%(a.width/32),size=roomStates.includes(state)?64:32;ctx.translate(p.x,p.y);if(p.heading==='left')ctx.scale(-1,1);sprite(key,f*32,0,32,32,-size/2,-size+4,size,size);ctx.restore();
 }
 function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}
 function path(points,t){let n=Math.min(points.length-2,Math.floor(Math.max(0,t)*(points.length-1))),u=Math.min(1,t)*(points.length-1)-n;return{x:lerp(points[n][0],points[n+1][0],u),y:lerp(points[n][1],points[n+1][1],u)};}
 function drawDetainee(){if(!detainee.visible||(!roomStates.includes(state)&&!(returning&&hasDetainee&&['unload','walkIn'].includes(state))))return;const key=detainee.moving?'detaineeWalk':'detaineeIdle',a=assets[key],f=Math.floor(elapsed/.13)%(a.width/32);const size=roomStates.includes(state)?44:32;sprite(key,f*32,0,32,32,detainee.x-size/2,detainee.y-size+4,size,size);}
 function compactRoom(){sprite('custodyRoom',0,0,1254,510,36,180,312,87);sprite('custodyRoom',0,510,1254,744,36,267,312,223);ctx.fillStyle='#d8d2b9';ctx.font='bold 7px monospace';ctx.fillText('КАМЕРА',277,361);}
 function drawCellGate(){ctx.strokeStyle='#929aa7';ctx.lineWidth=2;const y=388-cellDoor*37;ctx.fillStyle='#303943';ctx.fillRect(258,y,5,37);for(let d=1;d<36;d+=6){ctx.beginPath();ctx.moveTo(258,y+d);ctx.lineTo(263,y+d);ctx.stroke();}}
 function carDraw(){const key='car_'+fleet.selected(),a=assets[key],w=a.width/3,h=a.height/2,f=vehicle.frame===3?0:vehicle.frame;ctx.save();ctx.translate(vehicle.x,vehicle.y);ctx.rotate(vehicle.angle);sprite(key,f%3*w,Math.floor(f/3)*h,w,h,-50,-75,100,150);ctx.restore();}
 function complete(){panel.hidden=true;const callback=done;done=null;callback?.();}
 const roomRoutes=[[[192,321],[250,315],[297,292]],[[146,365],[142,310],[260,294],[297,304]],[[238,365],[260,335],[297,316]]];
 const clamp=t=>Math.max(0,Math.min(1,t));
 // Cubic routes carry their own heading, so the car follows the road rather
 // than rotating independently from its movement.
 const outRoute=[
  [2,[[117,402],[117,418],[117,434],[117,450]]],
  [2,[[117,450],[117,483],[192,500],[192,535]]],
  [2.2,[[192,535],[192,556],[192,577],[192,599]]],
  [1.5,[[192,599],[192,627],[168,651],[140,651]]],
  [2.5,[[140,651],[65,651],[0,651],[-85,651]]]
 ];
 const inRoute=[
  [2.5,[[-85,651],[0,651],[65,651],[140,651]]],
  [1.5,[[140,651],[168,651],[192,627],[192,599]]],
  [2.2,[[192,599],[192,577],[192,556],[192,535]]],
  [2,[[192,535],[192,500],[117,483],[117,450]]],
  [2,[[117,450],[117,434],[117,418],[117,402]]]
 ];
 function drive(route,t){
  for(const [duration,p,reverse] of route){if(t>duration){t-=duration;continue;}const u=clamp(t/duration),v=1-u;
   vehicle.x=v*v*v*p[0][0]+3*v*v*u*p[1][0]+3*v*u*u*p[2][0]+u*u*u*p[3][0];
   vehicle.y=v*v*v*p[0][1]+3*v*v*u*p[1][1]+3*v*u*u*p[2][1]+u*u*u*p[3][1];
   const dx=3*v*v*(p[1][0]-p[0][0])+6*v*u*(p[2][0]-p[1][0])+3*u*u*(p[3][0]-p[2][0]);
   const dy=3*v*v*(p[1][1]-p[0][1])+6*v*u*(p[2][1]-p[1][1])+3*u*u*(p[3][1]-p[2][1]);
   vehicle.angle=Math.atan2(dx,-dy)+(reverse?Math.PI:0);return false;
  }return true;
 }
 function drawDoor(room){
  if(doorOpen<=0)return;
  const x=room?265:178,y=room?208:224,w=room?50:30,h=room?59:32;
  ctx.fillStyle='#101819';ctx.fillRect(x,y,w,h);
  // Reuse the actual painted door leaf; narrow it toward the hinge as it opens.
  const width=Math.max(2,w*(1-doorOpen));
  if(room)sprite('custodyRoom',920,164,200,346,x,y,width,h);
  else sprite('yard',475,426,79,84,x,y,width,h);
 }
 function update(dt){elapsed+=dt;
  if(state==='waiting'&&elapsed>=dispatchDelay){phase('incoming');const notify=request;request=null;notify?.();}
  if(roomStates.includes(state)){
   const next=stationInterior.update(dt,elapsed);
   cellDoor=stationInterior.snapshot().doors.find(d=>d.id==='cell').open;
   if(next){if(next==='yardExit'){Object.assign(vehicle,{x:117,y:402,angle:Math.PI,frame:0});doorOpen=1;}if(next==='cellLock')cellOccupied=true;phase(next);}
   if(state==='roomReturn'&&elapsed>1.2)complete();
  }else if(state==='yardExit'){
   doorOpen=1-clamp((elapsed-2.3)/.4);
   people.forEach((p,i)=>{p.visible=elapsed>=i*.5;Object.assign(p,path([[192,252],[192+(i-1)*17,291+i*14]],clamp((elapsed-i*.5)/1.2)));p.moving=elapsed<i*.5+1.2;});
   if(elapsed>2.8){doorOpen=0;phase('approachCar');}
  }else if(state==='approachCar'){
   const targets=[[145,390],[89,390],[89,413]];
   people.forEach((p,i)=>{p.visible=true;Object.assign(p,path([[192+(i-1)*17,291+i*14],[targets[i][0],338],targets[i]],clamp((elapsed-i*.15)/2.7)));p.moving=elapsed<2.7+i*.15;});
   const near=people.some((p,i)=>Math.hypot(p.x-targets[i][0],p.y-targets[i][1])<18);
   vehicle.frame=near?(elapsed<2.6?1:2):0;
   if(elapsed>3.05){vehicle.frame=2;phase('boarding');}
  }else if(state==='boarding'){
   vehicle.frame=elapsed<1.25?2:elapsed<1.55?1:0;
   people.forEach((p,i)=>{p.visible=elapsed<.6+i*.2;p.moving=false;});
   if(elapsed>1.9){people.forEach(p=>p.visible=false);phase('driveOut');}
  }else if(state==='driveOut'||state==='driveIn'){
   const out=state==='driveOut';vehicle.frame=0;
   if(drive(out?outRoute:inRoute,elapsed)){if(out)complete();else{Object.assign(vehicle,{x:117,y:402,angle:0});phase('unload');}}
  }else if(state==='unload'){
   vehicle.frame=elapsed<.25?1:elapsed<2.3?2:elapsed<2.6?1:0;
   people.forEach((p,i)=>{const target=[[148,390],[87,390],[87,416]][i];p.visible=elapsed>.5+i*.2;p.x=lerp(117,target[0],elapsed-.5-i*.2);p.y=target[1];p.moving=p.visible&&elapsed<1.5+i*.2;});
   if(hasDetainee&&elapsed>2.7){vehicle.frame=elapsed<3?4:elapsed<4.8?5:elapsed<5.1?4:0;detainee.visible=elapsed>3.2;detainee.moving=elapsed<4.5;detainee.x=lerp(126,148,(elapsed-3.2)/1.1);detainee.y=416;}
   if(elapsed>(hasDetainee?5.4:3))phase('walkIn');
  }else if(state==='walkIn'){
   doorOpen=clamp((elapsed-2.3)/.5);
   people.forEach((p,i)=>{const start=[[148,390],[87,390],[87,416]][i];Object.assign(p,path([start,[start[0],335],[192,285],[192,252]],Math.max(0,elapsed-i*.2)/3.5));p.visible=elapsed<3.6+i*.2;p.moving=p.visible;});
   if(hasDetainee){Object.assign(detainee,path([[148,416],[148,335],[192,285],[192,252]],clamp((elapsed-.3)/3.5)));detainee.visible=elapsed<4;detainee.moving=true;}
   if(elapsed>4.3)phase(hasDetainee?'custodyEnter':'roomEnter');
  }

 }
 function render(){
  const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(cv.width!==Math.round(r.width*d)||cv.height!==Math.round(r.height*d)){cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);}
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#14201b';ctx.fillRect(0,0,cv.width,cv.height);
  const scale=Math.min(r.width/384,r.height/640)*d;ctx.setTransform(scale,0,0,scale,(cv.width-384*scale)/2,(cv.height-640*scale)/2);ctx.imageSmoothingEnabled=false;
  if(roomStates.includes(state)){
   stationInterior.transform(ctx,r.width,r.height,d);
   ctx.drawImage(assets.interior,0,0,768,512);
   uniform(3,6,91,151,36);
   ctx.drawImage(assets.interior,112,295,177,88,56,147.5,88.5,44);
   const seatedNow=['waiting','incoming','readyExit','roomReturn'].includes(state)||state==='roomExit'&&elapsed<.8;
   if(seatedNow){stationInterior.seats.forEach(([x,y],i)=>seated(i,x,y,state==='roomExit'?Math.min(5,2+Math.floor(elapsed*5)):0));}
   else people.forEach((p,i)=>person(i,p,p.moving));
   if(detainee.visible)drawDetainee();
   for(const p of stationInterior.held()){const a=assets.detaineeIdle;sprite('detaineeIdle',0,0,32,32,p.x-22,p.y-40,44,44);}
   stationInterior.drawDoors(ctx);
  }else{
   ctx.drawImage(assets.yard,0,32,384,576);
   sprite('yard',0,1480,1024,56,0,608,384,32);
   sprite('yard',0,1515,1024,21,0,640,384,32);
   // Original background coordinates are shifted down 32 px; logical positions
   // below retain the 64 px origin used by transit, so offset the actors as well.
   ctx.save();ctx.translate(0,-32);drawDoor(false);
   fleet.snapshot().owned.filter(id=>id!==fleet.selected()).forEach((id,i)=>{const a=assets['car_'+id];ctx.drawImage(a,0,0,a.width/3,a.height/2,192+i*80-50,385-75,100,150);});
   carDraw();drawDetainee();people.forEach((p,i)=>person(i,p,state!=='yard'&&p.moving!==false));ctx.restore();patrolShift.light(ctx,vehicle,people,elapsed,384,672);
  }
 }
 function loop(now){const dt=last?Math.min(.04,(now-last)/1000):0;last=now;if(!panel.hidden&&loaded){if(!paused&&!fleet.isOpen())update(dt);ui();render();}requestAnimationFrame(loop);}
 Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const a=new Image();a.onload=()=>{assets[key]=a;resolve();};a.onerror=()=>reject(new Error(file));a.src=file;}))).then(()=>{loaded=true;ui();}).catch(e=>{hint.textContent='Не удалось загрузить участок. Обновите страницу.';console.error(e);});
 requestAnimationFrame(loop);
 return{show,depart,arrive,setPaused:value=>{paused=!!value;last=0;ui();},snapshot:()=>({state,elapsed,loaded,paused,visible:!panel.hidden,returning,hasDetainee,interior:stationInterior.snapshot(),doorOpen,cellDoor,cellOccupied,detainee:{...detainee},vehicle:{...vehicle},people:people.map(p=>({...p}))})};
})();


