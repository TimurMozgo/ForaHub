'use strict';
// Coordinates are shared by the approved background, doorways and walking routes.
window.stationInterior=(()=>{
 const seats=[[202,407],[155,445],[250,445]],doors=[
  {id:'rest',x:198,y:336,w:64,axis:'x',swing:-1},{id:'gear',x:630,y:225,w:36,axis:'x',swing:1},
  {id:'interview',x:556,y:336,w:64,axis:'x',swing:-1},{id:'desk',x:176,y:225,w:40,axis:'x',swing:1},
  {id:'cell',x:382,y:225,w:50,axis:'x',barred:true,swing:1},{id:'yard',x:8,y:282,w:62,axis:'y',swing:-1}
 ].map(d=>({...d,open:0}));
 const exits=[[[202,407],[202,386],[198,386],[198,282],[-10,282]],[[155,445],[133,445],[133,390],[198,390],[198,282],[-10,282]],[[250,445],[266,445],[266,390],[198,390],[198,282],[-10,282]]];
 let people=[],prisoner=null,state='waiting',overview=false,camera={x:198,y:396},held=[];
 const gearPads=[[575,195],[630,195],[680,195]];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function route(p,points,delay=0){p.route=points.map(([x,y])=>({x,y}));p.wait=delay;p.visible=true;p.moving=false;}
 function reset(ps){people=ps;seats.forEach(([x,y],i)=>Object.assign(ps[i],{x,y,visible:true,moving:false,route:[],equipped:false,gearBlend:0,heading:i===1?'right':i===2?'left':'down',gait:0}));}
 function enter(next,ps,d){state=next;people=ps;prisoner=d;
  if(next==='waiting'){reset(ps);camera={x:198,y:396};}
  if(next==='roomExit'){overview=false;ps.forEach((p,i)=>route(p,[...exits[i].slice(0,-1),[630,282],[630,195],gearPads[i]],.8+i*.6));}
  if(next==='custodyEnter'||next==='roomEnter'&&ps.every(p=>p.x<200))ps.forEach(p=>Object.assign(p,{x:-10,y:282,visible:false,moving:false}));
  if(next==='custodyEnter'){
   overview=false;Object.assign(d,{x:-10,y:282,visible:true});
   route(d,[[-10,282],[176,282],[176,196]],.55);
   ps.forEach((p,i)=>route(p,[[-10,282],[176,282],[176,201],[[176,181],[207,201],[238,201]][i]],i===0?0:1.1+(i-1)*.55));
  }
  if(next==='custodyCell'){
   if(held.length>=6)held.shift();
   const slot=[0,1,2,3,4,5].find(i=>!held.some(p=>p.x===337+(i%3)*34&&p.y===(i<3?181:202)));route(d,[[176,201],[176,282],[382,282],[382,190],[337+(slot%3)*34,slot<3?181:202]],.55);
   route(ps[0],[[176,201],[176,282],[382,282],[382,175]],0);
   route(ps[1],[[207,201],[176,201],[176,282],[345,282]],1.1);
   route(ps[2],[[238,201],[176,201],[176,282],[430,282]],1.65);
  }
  if(next==='cellExit')route(ps[0],[[382,282]],0);
  if(next==='cellLock'){
   held.push({x:d.x,y:d.y,visible:true,moving:false});
   if(held.length>6)held.shift();d.visible=false;
  }
  if(next==='roomEnter'){
   overview=false;ps.forEach((p,i)=>{p.equipped=true;p.gearBlend=1;const start=p.x<0?[[-10,282]]:[[p.x,p.y],[p.x,282]];route(p,[...start,[630,282],[630,195],gearPads[i]],i*.6);});
  }
  if(next==='custodyEnter')ps.forEach(p=>{p.equipped=true;p.gearBlend=1;});
  if(next==='gearExit')ps.forEach((p,i)=>route(p,[[630,195],[630,282],[-10,282]],i*.65));
  if(next==='restEnter')ps.forEach((p,i)=>route(p,[[630,195],[630,282],[198,282],...exits[i].slice(0,-1).reverse()],i*.65));

 }
 function movingActors(){return [...people,...(prisoner?.visible?[prisoner]:[])];}
 function needsDoor(p,d){
  if(!p.visible||!p.route?.length||p.wait>0)return false;
  const normal=d.axis==='x'?'y':'x',along=d.axis==='x'?'x':'y';
  // Keep the leaf open until the last person has cleared the threshold.
  if(d.open>0&&Math.abs(p[normal]-d[normal])<18&&Math.abs(p[along]-d[along])<d.w/2+4)return true;
  let from=p,travel=0;
  for(const to of p.route){
   const length=Math.hypot(to.x-from.x,to.y-from.y),delta=to[normal]-from[normal];
   if(Math.abs(delta)>.001){const t=(d[normal]-from[normal])/delta;
    if(t>=0&&t<=1&&travel+t*length<=32&&Math.abs(from[along]+t*(to[along]-from[along])-d[along])<d.w/2-3)return true;
   }
   travel+=length;if(travel>32)break;from=to;
  }
  return false;
 }
 function updateDoors(dt){
  for(const d of doors){const locked=d.id==='cell'&&!['custodyCell','cellExit'].includes(state);
   const approached=!locked&&movingActors().some(p=>needsDoor(p,d));
   d.open=clamp(d.open+(approached?dt*3:-dt*2),0,1);
  }
 }
 function walk(p,dt){if(!p.route?.length){p.moving=false;return true;}if(p.wait>0){p.wait-=dt;p.moving=false;return false;}
  p.visible=true;let budget=56*dt;
  while(budget>0&&p.route.length){const t=p.route[0],dx=t.x-p.x,dy=t.y-p.y,len=Math.hypot(dx,dy);if(len<.01){p.route.shift();continue;}
   const step=Math.min(len,budget,2),nx=p.x+dx/len*step,ny=p.y+dy/len*step;
   // Hold short of a leaf until it is completely open; no wall/door teleportation.
   if(doors.some(d=>d.open<.93&&(d.axis==='x'?Math.abs(nx-d.x)<d.w/2+4&&Math.abs(ny-d.y)<12:Math.abs(nx-d.x)<12&&Math.abs(ny-d.y)<d.w/2+4))){p.moving=false;return false;}
   p.heading=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');p.gait=(p.gait||0)+step;p.x=nx;p.y=ny;p.facing=dx<-.01?-1:dx>.01?1:p.facing||1;p.moving=true;budget-=step;
   if(step===len)p.route.shift();
  }return !p.route.length;
 }
 function update(dt,elapsed){updateDoors(dt);
  if(['roomExit','custodyEnter','custodyCell','cellExit','roomEnter','gearExit','restEnter'].includes(state)){
   people.forEach(p=>walk(p,dt));if(['custodyEnter','custodyCell'].includes(state))walk(prisoner,dt);
   if(state==='gearExit'){people.forEach(p=>{if(!p.route.length)p.visible=false;});if(people.every(p=>!p.route.length))return 'yardExit';}
   if(state==='custodyEnter'&&people.every(p=>!p.route.length)&&!prisoner.route.length)return 'booking';
   if(state==='custodyCell'&&people.every(p=>!p.route.length)&&!prisoner.route.length)return 'cellExit';
   if(state==='cellExit'&&people.every(p=>!p.route.length))return 'cellLock';
   if(state==='roomExit'&&people.every(p=>!p.route.length))return 'gearEquip';
   if(state==='roomEnter'&&people.every(p=>!p.route.length))return 'gearUnequip';
   if(state==='restEnter'&&people.every(p=>!p.route.length)){reset(people);return 'roomReturn';}
  }
  if(['gearEquip','gearUnequip'].includes(state)){const k=clamp(elapsed/2.4,0,1);people.forEach(p=>{p.gearBlend=state==='gearEquip'?k:1-k;p.equipped=p.gearBlend>=.5;});if(k===1)return state==='gearEquip'?'gearExit':'restEnter';}
  if(state==='booking'&&elapsed>2.5)return 'custodyCell';
  if(state==='cellLock'&&elapsed>1.5)return 'roomEnter';
  return null;
 }
 function drawDoors(g){for(const d of doors){g.save();g.translate(d.x-d.w/2,d.y);
  if(d.axis==='y'){g.translate(d.w/2,-d.w/2);g.fillStyle='#66503a';g.fillRect(-4,0,6,d.w*(1-d.open));g.restore();continue;}
  if(d.barred){g.fillStyle='#626f72';g.fillRect(0,-26,d.w*2+4,3);g.translate((d.w+4)*d.open,0);g.fillStyle='#414d58';g.fillRect(0,-25,d.w,3);g.fillRect(0,-3,d.w,3);for(let x=2;x<d.w;x+=6){g.fillStyle='#b4bdb9';g.fillRect(x,-24,2,24);}}
  else{const angle=d.swing*d.open*Math.PI/2,dx=d.w*Math.cos(angle),dy=d.w*Math.sin(angle);g.fillStyle='#705238';g.strokeStyle='#c3a16d';g.lineWidth=1;g.beginPath();g.moveTo(0,-26);g.lineTo(dx,dy-26);g.lineTo(dx,dy);g.lineTo(0,0);g.closePath();g.fill();g.stroke();g.fillStyle='#d1bc77';g.fillRect(dx*.85-1,dy*.85-12,3,3);}
  g.restore();}}
 function transform(g,w,h,dpr){const portrait=w/h<1.1;let scale=overview?Math.min(w/768,(h-150)/512):Math.min(w/(portrait?370:768),(h-140)/440);
  scale=Math.max(.2,scale);let aim={x:198,y:396};
  if(['custodyEnter','booking','custodyCell','cellExit','cellLock'].includes(state))aim=prisoner;
  else if(['roomExit','roomEnter','gearExit','restEnter','gearEquip','gearUnequip'].includes(state)){const active=people.filter(p=>p.visible);if(active.length)aim={x:active.reduce((a,p)=>a+p.x,0)/active.length,y:active.reduce((a,p)=>a+p.y,0)/active.length};}
  const vw=w/scale,vh=(h-150)/scale;
  const targetX=overview||!portrait?384:clamp(aim.x,vw/2,768-vw/2),targetY=overview?256:clamp(aim.y,Math.min(256,vh/2),Math.max(256,512-vh/2));
  camera.x+=(targetX-camera.x)*.1;camera.y+=(targetY-camera.y)*.1;
  g.setTransform(scale*dpr,0,0,scale*dpr,(w/2-camera.x*scale)*dpr,(140+(h-150)/2-camera.y*scale)*dpr);
 }
 return {seats,reset,enter,update,drawDoors,transform,toggle:()=>overview=!overview,isOverview:()=>overview,
 held:()=>held,snapshot:()=>({state,overview,camera:{...camera},doors:doors.map(d=>({...d})),held:held.map(p=>({...p}))})};
})();
