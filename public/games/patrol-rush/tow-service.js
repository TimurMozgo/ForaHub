'use strict';
window.towService=(()=>{
 const sprite=new Image();sprite.src='street-assets/tow-truck.png';let jobs=[],completed=0,serial=0;
 function request(vehicle){if(!vehicle||vehicle.towRequested||!vehicle.visible)return false;vehicle.towRequested=true;const id='tow-'+(++serial);roadMotion.reserve(id);jobs.push({id,vehicle,x:-100,y:-200,w:64,h:116,visible:false,stage:'waiting',time:0,angle:0,route:null});return true;}
 function routeFor(j){const r=roadMotion,lanes=r.lanes(),v=j.vehicle,dir=v.x<192||r.bodies().some(b=>b!==v&&Math.abs(b.x-v.x)<65&&b.y<v.y&&v.y-b.y<340)?-1:1,lane=lanes.north;const before={x:lane,y:v.y-dir*100},align={x:v.x,y:v.y-dir*220},dock={x:v.x,y:v.y-dir*113};j.dir=dir;j.before=before;j.align=align;j.dock=dock;const start={x:lane,y:dir===1?1180:-180};Object.assign(j,start,{angle:dir===1?0:Math.PI,visible:true});j.route=r.path(r.line(start,before),r.bend(before,align));j.stage='approach';}
 function update(dt){dt=Math.min(dt,.05);const r=roadMotion;for(const j of jobs){
  if(j.stage==='waiting'){if(r.ready()&&!jobs.some(o=>o!==j&&o.visible))routeFor(j);continue;}
  if(j.stage==='approach'){if(r.advance(j,j.route,dt,100)){j.route=r.path(r.line(j.align,j.dock,true));j.stage='reverse';}}
  else if(j.stage==='reverse'){if(r.advance(j,j.route,dt,26)){j.stage='load';j.time=0;j.vehicle.visible=false;j.vehicle.frame=0;}}
  else if(j.stage==='load'){j.time+=dt;if(j.time>=3){j.route=r.path(r.line(j.dock,j.align));j.stage='clearBay';}}
  else if(j.stage==='clearBay'){if(r.advance(j,j.route,dt,38)){j.route=r.path(r.bend(j.align,j.before,true));j.stage='merge';}}
  else if(j.stage==='merge'){if(r.advance(j,j.route,dt,38)){const exit={x:j.before.x,y:j.dir===1?-180:1180};j.route=r.path(r.line(j.before,exit));j.stage='depart';}}
  else if(j.stage==='depart'){if(r.advance(j,j.route,dt,100)){j.visible=false;j.stage='done';r.release(j.id);completed++;}}
 }jobs=jobs.filter(j=>j.stage!=='done');}
 function draw(g,drawVehicle){for(const j of jobs){if(!j.visible||!sprite.complete||!sprite.naturalWidth)continue;g.save();g.translate(j.x,j.y);g.rotate(j.angle);g.drawImage(sprite,-32,-58,64,116);if(Math.floor(performance.now()/180)%2===0){g.fillStyle='#ffc75b';g.fillRect(-16,-34,8,3);g.fillRect(8,-34,8,3);}if(['load','clearBay','merge','depart'].includes(j.stage)){const t=j.stage==='load'?Math.min(1,j.time/2.6):1;g.strokeStyle='#a7a9a2';g.lineWidth=2;if(t<1){g.beginPath();g.moveTo(-17,60);g.lineTo(-17,100);g.moveTo(17,60);g.lineTo(17,100);g.stroke();}g.save();g.translate(0,113+(25-113)*t);g.scale(1-.2*t,1-.2*t);drawVehicle({...j.vehicle,x:0,y:0,angle:j.dir===1?0:Math.PI,visible:true,frame:0});g.restore();}g.restore();}}
 return {request,update,draw,bodies:()=>jobs.filter(j=>j.visible),reset(){for(const j of jobs)roadMotion.release(j.id);jobs=[];},snapshot:()=>({loaded:sprite.complete&&!!sprite.naturalWidth,completed,jobs:jobs.map(j=>({id:j.id,stage:j.stage,x:j.x,y:j.y,angle:j.angle,w:j.w,h:j.h,visible:j.visible,waiting:j.waiting,model:j.vehicle.model}))})};
})();
