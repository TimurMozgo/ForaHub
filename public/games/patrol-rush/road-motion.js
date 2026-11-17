'use strict';
window.roadMotion=(()=>{
 let env=null,traffic=[],serial=0,spawnClock=2,reservations=new Set();
 const models=[['sedan',false],['wagon',false],['hatchback',true],['coupe',false],['cargo',false],['sedan',true],['suv',false],['van',true]];
 const size=b=>({w:b.w||60,h:b.h||90});
 function corners(b,pad=0){const {w,h}=size(b),c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:b.x+x*(w/2+pad)*c-y*(h/2+pad)*s,y:b.y+x*(w/2+pad)*s+y*(h/2+pad)*c}));}
 function overlap(a,b,pad=0){const aa=corners(a,pad),bb=corners(b);for(const poly of [aa,bb])for(let i=0;i<2;i++){const p=poly[i],q=poly[i+1],nx=q.y-p.y,ny=p.x-q.x;const x=aa.map(p=>p.x*nx+p.y*ny),y=bb.map(p=>p.x*nx+p.y*ny);if(Math.max(...x)<=Math.min(...y)||Math.max(...y)<=Math.min(...x))return false;}return true;}
 function obstacles(){return env?env.fixed().map(b=>({x:b.x+b.w/2,y:b.y+b.h/2,w:b.w,h:b.h,angle:0})):[];}
 function bodies(){return [...traffic,...(env?.bodies()||[])].filter(b=>b.visible!==false);}
 function clear(body,pose,pad=2){const b={...body,...pose};if(corners(b).some(p=>p.x<1||p.x>383))return false;if(obstacles().some(o=>overlap(b,o,pad)))return false;return !bodies().some(o=>o!==body&&overlap(b,o,pad));}
 function reset(config){env=config;traffic=[];serial=0;spawnClock=2;reservations.clear();}
 function lanes(){const s=env.scene(),l=s.left+32,r=s.right-32;return {north:l+(r-l)*.75,south:l+(r-l)*.25};}
 function curve(p0,p1,p2,p3,reverse=false){const pts=[];let previous=p0;const n=100;for(let i=0;i<=n;i++){const t=i/n,u=1-t;const x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y;const dx=3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x),dy=3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y);pts.push({x,y,angle:Math.atan2(dx,-dy)+(reverse?Math.PI:0)});previous={x,y};}return pts;}
 function line(a,b,reverse=false){return curve(a,{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3},{x:a.x+(b.x-a.x)*2/3,y:a.y+(b.y-a.y)*2/3},b,reverse);}
 function bend(a,b,reverse=false){const dy=b.y-a.y;return curve(a,{x:a.x,y:a.y+dy*.42},{x:b.x,y:b.y-dy*.42},b,reverse);}
 function path(...segments){const pts=segments.flat(),dist=[0];for(let i=1;i<pts.length;i++)dist[i]=dist[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return {pts,dist,length:dist.at(-1),at:0};}
 function sample(route,d){let i=1;while(i<route.dist.length-1&&route.dist[i]<d)i++;const a=route.pts[i-1],b=route.pts[i],t=Math.max(0,Math.min(1,(d-route.dist[i-1])/(route.dist[i]-route.dist[i-1]||1)));let da=((b.angle-a.angle+Math.PI*3)%(Math.PI*2))-Math.PI;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};}
 function advance(body,route,dt,speed){
  if(body.yieldRemaining>0){body.yieldRemaining=Math.max(0,body.yieldRemaining-dt);const back=Math.max(0,route.at-24*dt),pose=sample(route,back);if(clear(body,pose,0)){Object.assign(body,pose);route.at=back;}return false;}
  let remaining=Math.min(speed*dt,route.length-route.at);while(remaining>.001){const d=Math.min(2,remaining),next=sample(route,route.at+d);if(!clear(body,next)){body.waiting=true;body.blockedSeconds=(body.blockedSeconds||0)+dt;if(body.blockedSeconds>.75&&route.at>2){body.blockedSeconds=0;body.yieldRemaining=.8;}return false;}body.blockedSeconds=0;Object.assign(body,next);route.at+=d;remaining-=d;}body.waiting=false;return route.at>=route.length-.01;}
 function reserve(id){reservations.add(id);}function release(id){reservations.delete(id);}function ready(body,route){
  if(!body||!route)return traffic.length===0;
  // Accept the first safe gap, not an entirely empty map. Check the swept merge
  // against where nearby traffic will be when the patrol reaches each sample.
  const end=Math.min(route.length,route.at+220);
  for(let d=route.at;d<=end;d+=8){const pose=sample(route,d),future=(d-route.at)/110;
   if(!clear(body,pose,4))return false;
   for(const v of traffic){const predicted={...v,y:v.y+(v.south?1:-1)*Math.max(v.speed,35)*future};if(overlap({...body,...pose},predicted,12))return false;}
  }
  return true;
 }
 function update(dt){
  spawnClock-=dt;if(spawnClock<=0&&traffic.length<5&&!reservations.size){const south=serial%2===0,x=south?lanes().south:lanes().north,y=south?-110:1134;const night=window.patrolShift?.isNight();const patrolCount=traffic.filter(v=>v.police).length;const [model,police]=night&&patrolCount<2?[['sedan','hatchback','van'][serial%3],true]:models[serial%models.length];serial++;spawnClock=3.5;
   const body={x,y,angle:south?Math.PI:0,w:50,h:76,model,police,visible:true,south,speed:0,cruise:70+(serial%3)*6};
   // Do not feed a lane blocked by a crash or a stationary service vehicle.
   const blocked=(env.bodies()||[]).some(b=>b.visible!==false&&Math.abs(b.x-x)<(size(b).w+body.w)/2+3&&b.y>0&&b.y<1024);
   if(!blocked&&clear(body,body,20))traffic.push(body);
  }
  traffic.sort((a,b)=>a.south===b.south?(a.south?b.y-a.y:a.y-b.y):0);
  for(const v of traffic){const sign=v.south?1:-1;const look={...v,y:v.y+sign*(24+v.speed*.7)};const target=clear(v,look,7)?v.cruise:0;v.speed=Math.max(0,Math.min(v.cruise,v.speed+(target>v.speed?35:-140)*dt));let distance=v.speed*dt;while(distance>.001){const d=Math.min(2,distance),next={x:v.x,y:v.y+sign*d,angle:v.angle};if(!clear(v,next,4)){v.speed=0;break;}v.y=next.y;distance-=d;}}
  traffic=traffic.filter(v=>v.y>-150&&v.y<1174);
 }
 function draw(g,img){for(const v of traffic){const im=img[(v.police?'car_':'enemy_')+v.model];if(!im)continue;const w=im.width/3,h=im.height/2;g.save();g.translate(v.x,v.y);g.rotate(v.angle);g.drawImage(im,4,4,w-8,h-8,-v.w/2,-v.h/2,v.w,v.h);g.restore();}}
 return {reset,clearTraffic(){traffic=[];},lanes,curve,line,bend,path,sample,advance,clear,overlap,corners,bodies,reserve,release,ready,update,draw,snapshot:()=>({traffic:traffic.map(v=>({...v})),reservations:[...reservations]})};
})();
