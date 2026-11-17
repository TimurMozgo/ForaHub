'use strict';
window.highSpeedChase=(()=>{
 let s=null,source=null,scene=null;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const models=['sedan','wagon','coupe','cargo','suv','police_sedan','police_hatchback','police_van'];
 function start(model,options){scene={...options.scene};source=document.createElement('canvas');source.width=384;source.height=1024;source.getContext('2d').drawImage(options.map,0,0);
  s={model,mode:'chase',time:0,signals:0,cooldown:0,result:null,speed:135,enemySpeed:180,distance:0,startY:options.car.y,serial:0,spawn:3,enemyLane:null,enemyBlocked:0,traffic:[],lostTime:0,settleTime:0,
   car:{x:options.car.x,y:options.car.y,angle:options.car.angle||0,w:60,h:90},enemy:{x:options.enemy.x,y:options.enemy.y,angle:options.enemy.angle||0,w:60,h:90},camera:{...options.camera}};
 }
 function gap(){return s.car.y-s.enemy.y;}
 function canSignal(){return s&&s.mode==='chase'&&s.time>=5&&s.distance>=900&&gap()>=40&&gap()<=230&&Math.abs(s.car.x-s.enemy.x)<105&&s.cooldown<=0;}
 function bayAhead(y){let base=Math.floor((y-250)/1024)*1024;let end=base+650;if(end>y-250)end-=1024;if(Math.abs(Math.floor(end/1024))%2===1)end-=1024;return end;}
 function signal(){if(!canSignal())return false;s.signals++;s.cooldown=3;chaseAudio.command();if(s.signals===2){s.mode='yield';const end={x:scene.parkingX,y:bayAhead(s.enemy.y)},entry={x:lanes().north,y:end.y+180};s.enemyRoute=roadMotion.path(roadMotion.line(s.enemy,entry),roadMotion.bend(entry,end));s.stopY=end.y;s.followRoute=roadMotion.path(roadMotion.bend(s.car,{x:lanes().north,y:end.y+170}));s.autoRoute=null;}return true;}
 function bodies(){return [s.car,s.enemy,...s.traffic];}
 function safe(body,next,pad=5){if(next.x<(scene.left+32)+31||next.x>351)return false;return !bodies().some(b=>b!==body&&roadMotion.overlap({...body,...next},b,pad));}
 function move(body,next){const from={x:body.x,y:body.y,angle:body.angle},n=Math.max(1,Math.ceil(Math.hypot(next.x-from.x,next.y-from.y)/2));let da=Math.atan2(Math.sin(next.angle-from.angle),Math.cos(next.angle-from.angle));for(let i=1;i<=n;i++){const t=i/n,p={x:from.x+(next.x-from.x)*t,y:from.y+(next.y-from.y)*t,angle:from.angle+da*t};if(!safe(body,p))return false;Object.assign(body,p);}return true;}
 function drive(body,route,dt,speed){let d=Math.min(speed*dt,route.length-route.at);while(d>.001){const step=Math.min(2,d),p=roadMotion.sample(route,route.at+step);if(!move(body,p))return false;route.at+=step;d-=step;}return route.at>=route.length-.01;}
 function lanes(){const l=scene.left+32,r=scene.right-32;return {north:l+(r-l)*.75,south:l+(r-l)*.25};}
 // Follow longitudinal traffic before collision contact; steering remains independent.
 function followingSpeed(body,desired){
  let limit=desired;
  for(const other of bodies()){
   if(other===body)continue;
   const distance=body.y-other.y,side=Math.abs(body.x-other.x);
   if(distance<=0||side>(body.w+other.w)/2+9)continue;
   const velocity=other===s.enemy?s.enemySpeed:other===s.car?s.speed:(other.south?-(other.actualSpeed??other.speed):(other.actualSpeed??other.speed));
   const clearance=(body.h+other.h)/2+40;
   limit=Math.min(limit,Math.max(0,velocity+(distance-clearance)*1.5));
  }
  return limit;
 }
 function spawn(){if(s.traffic.length>=4)return;const south=s.serial%2===0,x=south?lanes().south:lanes().north,y=Math.min(s.car.y-1050,s.enemy.y-300),model=models[s.serial++%models.length];const v={x,y,angle:south?Math.PI:0,w:50,h:76,model,south,speed:south?110:195};if(south&&(s.enemyLane===lanes().south||s.enemy.x<lanes().north-10))return;if(safe(v,v,80))s.traffic.push(v);}
 function update(dt,dx,dy){if(!s||s.result!==null)return;dt=Math.min(.04,dt);s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
  s.spawn-=dt;if(s.mode==='chase'&&s.spawn<=0){spawn();s.spawn=4;}
  for(const v of s.traffic){const before=v.y,next={x:v.x,y:v.y+(v.south?1:-1)*v.speed*dt,angle:v.angle};move(v,next);v.actualSpeed=Math.abs(v.y-before)/dt;}
  s.traffic=s.traffic.filter(v=>v.y<s.car.y+1000&&v.y>s.car.y-1800);
  if(s.mode==='chase'){
   const requested=clamp(300-dy*240,0,395),target=followingSpeed(s.car,requested);s.following=target<requested-5;s.speed+=clamp(target-s.speed,-400*dt,100*dt);
   // Recover a nose-to-nose stop by yielding back to our own lane.
   // Even with no throttle input this keeps a meeting with oncoming traffic live.
   const meeting=s.traffic.find(v=>v.south&&v.y<s.car.y&&s.car.y-v.y<260&&Math.abs(v.x-s.car.x)<75);
   if(meeting&&s.car.x<lanes().north-2)dx=Math.max(dx,clamp((lanes().north-s.car.x)/35,0,1));
   const beforeY=s.car.y;
   const vx=clamp(dx,-1,1)*145,angle=Math.atan2(vx,Math.max(100,s.speed));
   const nextCar={x:clamp(s.car.x+vx*dt,lanes().south,lanes().north),y:s.car.y-s.speed*dt,angle:clamp(angle,-.17,.17)};
   if(!move(s.car,nextCar)){
    // A failed turn is not a reason to stop a clear forward path.
    const forward=move(s.car,{x:s.car.x,y:s.car.y-s.speed*dt,angle:0});
    if(Math.abs(vx)>1)move(s.car,{x:nextCar.x,y:s.car.y,angle:0});
    if(!forward)s.speed=0;
   }
   s.speed=Math.min(s.speed,Math.max(0,(beforeY-s.car.y)/dt));

   s.enemySpeed+=clamp(followingSpeed(s.enemy,282)-s.enemySpeed,-400*dt,65*dt);
   // Finish a lane change before selecting another one; no frame-by-frame weaving.
   const north=lanes().north,south=lanes().south;
   if(s.enemyLane===null)s.enemyLane=north;
   // Keep the fleeing driver in its travel lane and follow slower vehicles.
   // Entering the opposing lane created an unrecoverable three-car lock.
   s.enemyLane=north;
   const ex=s.enemy.x+clamp(s.enemyLane-s.enemy.x,-60*dt,60*dt),ea=clamp(Math.atan2((ex-s.enemy.x)/Math.max(dt,.001),Math.max(100,s.enemySpeed)),-.12,.12);
   if(move(s.enemy,{x:ex,y:s.enemy.y-s.enemySpeed*dt,angle:ea})){s.enemyBlocked=0;}
   else{
    s.enemyBlocked+=dt;s.enemySpeed=Math.max(0,s.enemySpeed-400*dt);
    // A blocked diagonal must not also prevent a clear straight-ahead movement.
    if(move(s.enemy,{x:s.enemy.x,y:s.enemy.y-Math.max(70,s.enemySpeed)*dt,angle:0}))s.enemyBlocked=0;
    if(s.enemyBlocked>.8){const nearest=Math.abs(s.enemy.x-north)<Math.abs(s.enemy.x-south)?north:south;s.enemyLane=nearest;move(s.enemy,{x:s.enemy.x+clamp(nearest-s.enemy.x,-40*dt,40*dt),y:s.enemy.y,angle:0});}
   }
   if(gap()>950)s.lostTime+=dt;else s.lostTime=0;
   if(s.lostTime>4){s.mode='lost';const stop=bayAhead(s.car.y),approach={x:lanes().north,y:stop+180};s.autoRoute=roadMotion.path(roadMotion.line(s.car,approach),roadMotion.bend(approach,{x:scene.parkingX,y:stop}));}
  }else if(s.mode==='yield'){
   s.enemySpeed=Math.max(s.enemyRoute.length-s.enemyRoute.at>320?170:45,s.enemySpeed-90*dt);const stopped=drive(s.enemy,s.enemyRoute,dt,s.enemySpeed);
   // Follow on the road until the suspect has fully cleared the lane.
   const targetX=lanes().north;s.speed=Math.min(170,Math.max(20,(s.followRoute.length-s.followRoute.at)*1.3));if(!stopped&&Math.abs(s.car.x-s.enemy.x)<95)s.speed=Math.min(s.speed,Math.max(0,(gap()-170)*2));const followed=drive(s.car,s.followRoute,dt,s.speed);
   if(followed)s.speed=0;
   if(stopped&&followed){s.enemySpeed=0;s.mode='overtake';const pass={x:targetX,y:s.stopY-90},front={x:scene.parkingX,y:s.stopY-220};s.autoRoute=roadMotion.path(roadMotion.line(s.car,pass),roadMotion.bend(pass,front));}
  }else if(s.mode==='overtake'){
   s.speed=Math.max(20,Math.min(100,(s.autoRoute.length-s.autoRoute.at)*.9));if(drive(s.car,s.autoRoute,dt,s.speed)){s.speed=0;s.mode='settled';}
  }else if(s.mode==='settled'){s.settleTime+=dt;if(s.settleTime>1)s.result=true;}
  else if(s.mode==='lost'){s.speed=Math.max(35,s.speed-80*dt);if(drive(s.car,s.autoRoute,dt,s.speed)){s.speed=0;s.result=false;}}
  s.distance=Math.max(s.distance,s.startY-s.car.y);
 }
 function background(g,img,top,height){
  g.fillStyle='#303936';g.fillRect(-200,top,800,height);
  const first=Math.floor(top/16)*16;
  for(let y=first;y<Math.min(0,top+height);y+=16)for(let x=0;x<384;x+=16){const local=((y%1024)+1024)%1024,cross=local>=900;const key=cross?'road6':x<scene.left?'roof6':x<scene.left+32||x>=scene.right-32?'pave2':'road6';g.drawImage(img[key],x,y,16,16);}
  for(let k=Math.floor(top/1024);k<=Math.floor(Math.min(-1,top+height)/1024);k++){
   const y=k*1024;
   // Short blocks and frontages, using the same atlas as the dispatch streets.
   for(const [offset,h] of [[0,260],[330,240],[640,230]]){
    for(let yy=y+offset;yy<y+offset+h;yy+=16)for(let x=0;x<scene.left;x+=16)g.drawImage(img.roof6,x,yy,16,16);
    g.drawImage(img.atlas,16,144,128,192,0,y+offset+h-116,scene.left,116);
    g.strokeStyle='#242a2e';g.lineWidth=2;g.strokeRect(1,y+offset+1,scene.left-2,h-2);
   }
   const rightBlocks=Math.abs(k)%2===0?[[0,240]]:[[0,300],[380,280],[740,160]];
   for(const [offset,h] of rightBlocks){for(let yy=y+offset;yy<y+offset+h;yy+=16)for(let x=scene.right;x<384;x+=16)g.drawImage(img.roof6,x,yy,16,16);
    g.drawImage(img.atlas,192,192,176,144,scene.right,y+offset+h-86,384-scene.right,86);
    g.strokeStyle='#242a2e';g.strokeRect(scene.right,y+offset,384-scene.right,h);}

   for(let yy=y;yy<y+870;yy+=16){g.drawImage(img.curb11,scene.left+24,yy,8,16);g.drawImage(img.curb13,scene.right-32,yy,8,16);}
   g.fillStyle='#c8c6aa';for(let yy=y+20;yy<y+860;yy+=48)g.fillRect(192,yy,2,20);
   for(const edge of [y+880,y+1008]){for(let x=0;x<384;x+=16)g.drawImage(img.pave2,x,edge,16,16);for(let x=scene.left+32;x<scene.right-32;x+=16)g.drawImage(img.pave6,x,edge-8,8,28);}
   g.fillStyle='#b5bda7';g.font='8px monospace';g.fillText('КВАРТАЛ '+Math.abs(k),scene.right-16,y+275);
   g.drawImage(img.object24,359,y+305,20,16);
   // The forecourt stays clear for both stopped cars and the tow truck.
  }
  if(top<0){g.fillStyle='#102b2530';g.fillRect(0,top,384,Math.min(-top,height));}if(top+height>0)g.drawImage(source,0,0);
 }
 function sprite(g,img,model,b,police=false){const im=img[(police?'car_':'enemy_')+model],w=im.width/3,h=im.height/2;g.save();g.translate(b.x,b.y);g.rotate(b.angle||0);g.drawImage(im,4,4,w-8,h-8,-b.w/2,-b.h/2,b.w,b.h);g.restore();}
 function lights(g,x,y,time){g.save();g.globalCompositeOperation='lighter';for(const [on,color,off] of [[Math.floor(time*7)%4===0,'#428cff',-5],[Math.floor(time*7)%4===2,'#ff493f',5]])if(on){g.fillStyle=color;g.globalAlpha=.2;g.beginPath();g.ellipse(x+off*2,y-7,25,17,0,0,Math.PI*2);g.fill();g.globalAlpha=1;g.fillRect(x+off-3,y-9,6,4);}g.restore();}
 function draw(display,img,policeModel,view){const c=s.camera,scale=view.w/384,follow=s.mode==='overtake'||s.mode==='settled'?(s.car.y+s.enemy.y)/2:s.car.y;c.scale+=(scale-c.scale)*.08;const height=view.h/c.scale;c.x+=(Math.max(0,(384-view.w/c.scale)/2)-c.x)*.08;c.y+=(follow-height*.64-c.y)*.1;
  display.setTransform(view.dpr*c.scale,0,0,view.dpr*c.scale,-c.x*view.dpr*c.scale,-c.y*view.dpr*c.scale);display.imageSmoothingEnabled=false;background(display,img,c.y,height);
  for(const v of s.traffic)sprite(display,img,v.model.replace('police_',''),v,v.model.startsWith('police_'));
  if(s.mode!=='lost')sprite(display,img,s.model,s.enemy);sprite(display,img,policeModel,s.car,true);lights(display,s.car.x,s.car.y,s.time);
  if(window.patrolShift?.isNight()){display.save();display.translate(0,c.y);patrolShift.light(display,{...s.car,y:s.car.y-c.y},[],s.time,384,height);display.restore();}
  const targetScreen=(s.enemy.y-c.y)*c.scale;if(s.mode==='chase'&&targetScreen<180){display.save();display.setTransform(view.dpr,0,0,view.dpr,0,0);display.fillStyle='#e3bd77';display.font='bold 12px monospace';display.textAlign='center';display.fillText('▲ НАРУШИТЕЛЬ · '+Math.round(gap()*.2)+' М',view.w/2,205);display.restore();}
 }
 function finish(map,img){const origin=Math.round(s.car.y-390);const g=map.getContext('2d');g.setTransform(1,0,0,1,0,-origin);background(g,img,origin,1024);g.setTransform(1,0,0,1,0,0);const solids=[];for(let k=Math.floor(origin/1024);k<=Math.floor((origin+1024)/1024);k++)for(const [offset,h] of (Math.abs(k)%2===0?[[0,240]]:[[0,300],[380,280],[740,160]]))solids.push({x:scene.right,y:k*1024+offset-origin,w:384-scene.right,h});return {solids,origin,car:{...s.car,y:s.car.y-origin},enemy:{...s.enemy,y:s.enemy.y-origin},camera:{...s.camera,y:s.camera.y-origin},distance:s.distance,caught:s.result===true};}
 return {start,update,signal,draw,lights,finish,snapshot:()=>s?{model:s.model,mode:s.mode,time:s.time,signals:s.signals,cooldown:s.cooldown,result:s.result,speed:s.speed,following:s.following,enemySpeed:s.enemySpeed,distance:s.distance,car:{...s.car},enemy:{...s.enemy},camera:{...s.camera},x:s.car.x,y:s.car.y,enemyX:s.enemy.x,gap:gap(),kmh:Math.round(s.speed*.4),canSignal:canSignal(),traffic:s.traffic.map(v=>({...v}))}:null};
})();

