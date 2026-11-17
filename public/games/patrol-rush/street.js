'use strict';
const W=384,H=1024,canvas=document.querySelector('canvas'),display=canvas.getContext('2d');
const world=document.createElement('canvas');world.width=W;world.height=H;const g=world.getContext('2d');
const map=document.createElement('canvas');map.width=W;map.height=H;const mg=map.getContext('2d');
const img={},sources={serviceAtlas:'service-atlas.png',atlas:'city-atlas.png',car:'sedan-doors.png'};
for(const model of ['sedan','coupe','suv','wagon','cargo'])sources['enemy_'+model]='enemy-'+model+'.png';
for(const car of fleet.catalog)sources['car_'+car.id]=car.file;
for(let i=1;i<=12;i++)sources['road'+i]='City_Tileset/Road/Asphalt/'+i+'.png';
for(let i=1;i<=12;i++)sources['pave'+i]='City_Tileset/Road/Pavement/1 - '+i+'.png';
for(let i=1;i<=12;i++)sources['roof'+i]='City_Tileset/Road/Roof/'+i+'.png';
for(const i of [11,13,16,19])sources['curb'+i]='City_Tileset/Road/Curb/'+i+'.png';
for(const i of [1,3,8])sources['line'+i]='City_Tileset/Road/Markup/'+i+'.png';
for(const i of [11,12,14,18,24,33,34])sources['object'+i]='City_Tileset/Objects/'+i+'.png';
for(let i=1;i<=3;i++)for(const a of ['Idle','Walk','Shot','Hurt'])sources['p'+i+a]='police/'+i+'-'+a+'.png';
for(const a of ['Idle','Walk'])sources['npc'+a]='suspect/'+a+'.png';
Object.assign(sources, {
 npcStrike:'suspect/Attack_1.png',
 armedIdle:'dispatch/armed-idle.png',
 armedWalk:'dispatch/armed-walk.png',
 armedSurrender:'dispatch/armed-cast.png',armedShot:'dispatch/armed-shot.png',armedHurt:'dispatch/armed-hurt.png',armedDead:'dispatch/armed-dead.png',
});
// Each dispatch has its own street layout, assembled from the supplied city tiles.
const scenes=[
 {bands:[[-16,208],[224,240],[592,192],[816,224]],left:96,right:288,props:[['object33',290,348,32,22,1],['object24',84,274,20,16,1],['object12',277,616,12,12,1],['object11',103,813,10,10,0]]},
 {bands:[[-16,190],[278,245],[610,162],[826,230]],left:108,right:276,props:[['object24',96,294,20,16,1],['object14',123,390,7,7,0],['object11',265,555,10,10,0]]},
 {bands:[[-16,300],[430,206],[808,230]],left:94,right:286,props:[['object33',259,348,32,22,1],['object18',271,407,5,5,0],['object11',102,673,10,10,0]]},
 {bands:[[-16,230],[340,308],[814,230]],left:110,right:278,props:[['object24',92,664,20,16,1],['object14',265,430,7,7,0]]},
 {bands:[[-16,200],[314,266],[830,210]],left:98,right:290,props:[['object11',108,250,10,10,0],['object12',270,590,12,12,1],['object14',274,463,7,7,0]]},
 {bands:[[-16,258],[390,236],[818,226]],left:116,right:270,props:[['object33',270,346,32,22,1],['object18',262,410,5,5,0],['object24',95,652,20,16,1]]},
];
scenes.push(
 {bands:[[-16,190],[480,185],[820,220]],left:82,right:306,props:[['object11',93,278,10,10,0],['object14',282,345,7,7,0]]},
 {bands:[[-16,310],[370,270],[820,220]],left:76,right:310,props:[['object11',88,195,10,10,0],['object11',291,510,10,10,0]]},
 {bands:[[-16,190],[490,160],[820,220]],left:83,right:305,props:[['object33',270,280,32,22,1],['object24',84,430,20,16,1]]},
 {bands:[[-16,210],[465,200],[830,210]],left:88,right:305,props:[['object11',275,310,10,10,0],['object14',101,390,7,7,0],['object12',271,550,12,12,1]]},
 {bands:[[-16,240],[490,180],[820,220]],left:80,right:310,props:[['object33',263,275,32,22,1],['object12',250,390,12,12,1],['object12',266,402,12,12,1],['object12',245,420,12,12,1],['object24',83,450,20,16,1]]}
);
scenes.push(
 {bands:[[-16,245],[760,280]],left:16,right:260,props:[]},
 {bands:[[-16,300],[850,200]],left:16,right:260,props:[]},
 {bands:[[-16,220],[880,170]],left:16,right:260,props:[]}
);
// Calls occupy paved forecourts; only crash vehicles remain in the travel lanes.
scenes.forEach((s,i)=>{s.left=Math.min(80,s.left);s.right=Math.max(310,s.right);s.yardTop=i===7?280:i===10?200:180;s.yardBottom=i===7?850:780;s.parkingX=Math.min(342,s.right+10);});
scenes.forEach((s,i)=>{if(i>=11)Object.assign(s,{left:16,right:260,yardTop:i===12?300:220,yardBottom:900,parkingX:270});});
const blocks=[],props=[],fixed=[];
scenes[11].yardBottom=1024;scenes[11].parkingX=260;
function setScene(index){
 const scene=scenes[index];blocks.length=0;props.length=0;fixed.length=0;
 for(const [y,h] of scene.bands)blocks.push({x:0,y,w:scene.left,h});
 blocks.push({x:scene.right,y:-16,w:W-scene.right,h:scene.yardTop+16},{x:scene.right,y:scene.yardBottom,w:W-scene.right,h:H-scene.yardBottom});
 for(const [key,x,y,w,h,solid] of scene.props){
  const px=W-w-5,py=Math.max(scene.yardTop+12,Math.min(scene.yardBottom-h-16,y));
  props.push({key,x:px,y:index>=6&&w>=30?scene.yardBottom-h-12:py,w,h,solid:!!solid});
 }
 for(let i=blocks.length-1;i>=0;i--)if(blocks[i].h<=0)blocks.splice(i,1);
 fixed.push(...blocks,...props.filter(p=>p.solid).map(p=>({x:p.x,y:p.y+5,w:p.w,h:p.h-5})));
 buildMap();
}
const car={x:232,y:748,frame:0},player=entity('p3',265,748),bots=[entity('p1',207,735),entity('p2',207,762)],npc=entity('npc',274,333);
const camera={x:0,y:0,scale:1,w:390,h:844,dpr:1};
const keys=new Set();let joyX=0,joyY=0,joyPointer=null,ready=false,paused=false,modal='',phase='briefing',time=0,clock=0,last=0,marker=null,choice='',inCar=false,released=false,repath=0,trail=[],doorTarget=0,doorTick=0,boardingClose=-1;
let clickInfo=null,loadingPreclose=0,boardingAlreadyOpen=false;
let selectedCall=0, activeCall=null, callResult='', callConsequence={};
const callStarts=calls.map(()=>0);
try{const saved=JSON.parse(localStorage.getItem('police-call-variants-v1'));if(Array.isArray(saved))saved.forEach((v,i)=>{if(i<callStarts.length&&Number.isSafeInteger(v)&&v>=0)callStarts[i]=v%2;});}catch{}
let missionId=null,pendingPursuit=null,afterExit=null,pursuitStop=null;
const $=id=>document.getElementById(id);
function entity(kind,x,y){return {kind,x,y,face:1,path:[],moving:false,visible:false,hp:100};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function free(x,y){if(x<9||x>375||y<12||y>1012)return false;const r=5;if([...fixed,...(activeCall?.covers||[])].some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h))return false;if(activeCall?.vehicles?.some(v=>v.visible&&!v.driveAway&&Math.abs(x-v.x)<22&&Math.abs(y-v.y)<40))return false;return !(x+r>car.x-15&&x-r<car.x+15&&y+r>car.y-37&&y-r<car.y+32);}
function nearest(x,y){if(free(x,y))return {x,y};for(let r=8;r<=64;r+=8)for(let k=0;k<16;k++){const a=k*Math.PI/8,p={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};if(free(p.x,p.y))return p;}return null;}
function route(a,x,y){
 const target=nearest(x,y);if(!target)return [];const cols=48,rows=128;
 const point=i=>({x:i%cols*8+4,y:Math.floor(i/cols)*8+4});
 const cell=(x,y)=>{let best=-1,d=Infinity;const cx=Math.floor(x/8),cy=Math.floor(y/8);for(let yy=Math.max(0,cy-6);yy<=Math.min(rows-1,cy+6);yy++)for(let xx=Math.max(0,cx-6);xx<=Math.min(cols-1,cx+6);xx++){const i=yy*cols+xx,p=point(i),dd=(p.x-x)**2+(p.y-y)**2;if(dd<d&&free(p.x,p.y)){d=dd;best=i;}}return best;};
 const start=cell(a.x,a.y),end=cell(target.x,target.y);if(start<0||end<0)return [];
 const q=[start],parent=new Int32Array(cols*rows).fill(-2);parent[start]=-1;
 for(let n=0;n<q.length&&parent[end]===-2;n++){const cur=q[n],cx=cur%cols,cy=Math.floor(cur/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=cols||ny<0||ny>=rows)continue;const i=ny*cols+nx,p=point(i);if(parent[i]===-2&&free(p.x,p.y)){parent[i]=cur;q.push(i);}}}
 if(parent[end]===-2)return [];const result=[];for(let i=end;i!==-1;i=parent[i])result.push(point(i));result.reverse();result.push(target);return result;
}
function move(a,dx,dy){const bx=a.x,by=a.y;if(free(a.x+dx,a.y))a.x+=dx;if(free(a.x,a.y+dy))a.y+=dy;a.moving=Math.hypot(a.x-bx,a.y-by)>.02;if(Math.abs(dx)>.01)a.face=dx<0?-1:1;}
function followPath(a,dt,speed=76){
 a.moving=false;if(!a.path.length||dt<=0)return;let remaining=speed*dt,moved=false;
 // Spend the complete frame budget, including after reaching a grid waypoint.
 for(let n=0;n<16&&remaining>0&&a.path.length;n++){
  const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,len=Math.hypot(dx,dy);
  if(len<.05){a.x=p.x;a.y=p.y;a.path.shift();continue;}
  const step=Math.min(len,remaining),before={x:a.x,y:a.y};move(a,dx/len*step,dy/len*step);const distance=dist(a,before);
  moved=moved||distance>.02;remaining-=step;
  if(distance<.001&&step>.05){a.path=[];break;}
  if(step===len&&dist(a,p)<.05){a.x=p.x;a.y=p.y;a.path.shift();}
 }
 a.moving=moved;
}
function clearLine(a,b){const len=dist(a,b),steps=Math.ceil(len/3);for(let i=1;i<=steps;i++){const t=i/steps;if(!free(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
function planCompanion(a,i){
 const t=trail[Math.max(0,trail.length-3-i)]||player,goal=nearest(t.x+(i?7:-7),t.y);
 if(!goal)return;if(dist(a,goal)<4){a.path=[];return;}
 // Prefer a clear route to a nearby formation slot. Keep obstacle routes until
 // their destination changes meaningfully, instead of restarting every tick.
 if(clearLine(a,goal)){a.path=[goal];return;}
 const old=a.path[a.path.length-1];if(!old||dist(old,goal)>12)a.path=route(a,goal.x,goal.y);
}
function escortGoal(){
 // Interpolate by travelled distance, including the player's current position.
 // The target moves continuously instead of jumping between old grid cells.
 let previous={x:player.x,y:player.y},remaining=22;
 for(let i=trail.length-1;i>=0;i--){const point=trail[i],length=dist(previous,point);if(length>=remaining&&length>0){const t=remaining/length;return {x:previous.x+(point.x-previous.x)*t,y:previous.y+(point.y-previous.y)*t};}remaining-=length;previous=point;}
 return previous;
}
function moveEscort(dt){
 const goal=escortGoal(),target=nearest(goal.x,goal.y);if(!target)return;
 npc.repathTimer=Math.max(0,(npc.repathTimer||0)-dt);
 if(clearLine(npc,target))npc.path=[target];
 else {const old=npc.path[npc.path.length-1];if(npc.repathTimer===0&&(!old||dist(old,target)>12)){npc.path=route(npc,target.x,target.y);npc.repathTimer=.3;}}
 const speed=Math.min(130,86+Math.max(0,dist(npc,player)-30)*1.6);
 followPath(npc,dt,speed);
}
function setPhase(next){phase=next;time=0;keys.clear();resetJoy();document.querySelector('#app').classList.toggle('chasing',next==='pursuit');chaseAudio.setActive(['chaseLaunch','pursuit'].includes(next)&&!paused&&!modal);updateUI();}
const dispatchStorageKey='police-dispatch-v1';
const validCall=i=>Number.isInteger(i)&&i>=0&&i<calls.length;
let dispatchQueue=[0],lastDispatch=-1;
try{
 const saved=JSON.parse(localStorage.getItem(dispatchStorageKey));
 if(saved&&Array.isArray(saved.remaining)&&saved.remaining.every(validCall)&&new Set(saved.remaining).size===saved.remaining.length&&validCall(saved.last)){
  lastDispatch=saved.last;dispatchQueue=saved.remaining.filter(i=>i!==lastDispatch);
  if((saved.catalogSize||6)<calls.length)dispatchQueue=[...calls.map((_,i)=>i).filter(i=>i>=(saved.catalogSize||6)&&i!==lastDispatch&&!dispatchQueue.includes(i)),...dispatchQueue];
 }else if(fleet.snapshot().rewards.length){
  // Existing players have already completed the introductory dispatch.
  lastDispatch=0;dispatchQueue=[];
 }
}catch{}
function nextDispatch(){return patrolShift.next(calls);}

function reset(){
 pendingPursuit=null;afterExit=null;pursuitStop=null;choice='';callResult='';callConsequence={};activeCall=null;inCar=false;released=false;paused=false;modal='briefing';
 car.x=232;car.y=1100;car.frame=0;doorTarget=0;marker=null;trail=[];boardingClose=-1;
 Object.assign(player,entity('p3',265,748));
 Object.assign(bots[0],entity('p1',207,735));Object.assign(bots[1],entity('p2',207,762));
 Object.assign(npc,entity('npc',274,333),{visible:true,pose:null,repathTimer:0});
 setScene(selectedCall);
 $('result').hidden=true;$('dialogue').hidden=true;$('pause-layer').hidden=true;$('briefing').hidden=false;
 updateBriefing();setPhase('briefing');
 $('briefing').hidden=true;
 window.stationBase.show(()=>{selectedCall=nextDispatch();updateBriefing();$('briefing').hidden=false;});
}
function updateBriefing(){
 const call=calls[selectedCall],number=String(selectedCall+1).padStart(2,'0');
 $('briefing-title').textContent=call.title.toUpperCase();
 $('briefing-copy').textContent=call.brief;
 $('briefing-area').textContent=call.area.toUpperCase();
 $('briefing-shift').textContent=patrolShift.label();
 const risk=[5,8,11,12].includes(selectedCall)?'high':[3,6,7,9,10,13].includes(selectedCall)?'caution':'standard';
 $('briefing-risk').textContent={high:'ВЫСОКАЯ',caution:'ПОВЫШЕННАЯ',standard:'ОБЫЧНАЯ'}[risk];
 $('briefing').dataset.risk=risk;
 $('call-title').textContent='ВЫЗОВ · '+call.title.toUpperCase();
 $('call-location').textContent=patrolShift.label()+' · '+call.area.toUpperCase();
 $('result-call').textContent='ВЫЗОВ '+number+' · ЗАВЕРШЁН';
}
function closeConversation(){
 modal='';$('dialogue').hidden=true;
}
function openConversation(title,copy,options){
 modal='dialogue';keys.clear();resetJoy();
 if($('dialogue-kind'))$('dialogue-kind').textContent=selectedCall===8?'РАЗГОВОР · ПОДОЗРЕВАЕМЫЙ':'РАЗГОВОР · ВОДИТЕЛЬ';$('dialogue-title').textContent=title;$('dialogue-copy').textContent=copy;
 $('legacy-options').hidden=!!options;$('call-options').hidden=!options;
 if(options){
  $('call-options').replaceChildren(...options.map(({label,act},i)=>{
   const button=document.createElement('button');
   button.textContent=label;if(i===0)button.className='primary';
   button.onclick=()=>{closeConversation();act();updateUI();};
   return button;
  }));
 }
 $('dialogue').hidden=false;
}
function completeCall(copy, consequence={}){
 callResult=copy;callConsequence=consequence;choice=consequence.release?'warning':'peaceful';player.path=[];marker=null;
 if(consequence.release){npc.pose=null;npc.path=route(npc,240,214);released=false;}
 setPhase('return');
}
function escortFromCall(copy,consequence={}){
 callConsequence=consequence;callResult=copy;resolve('detain');
}
function playable(){return ready&&!paused&&!modal&&['patrol','escort','return','readyDepart','pursuitReady','pursuit'].includes(phase);}
function action(){
 if(!playable())return;
 if(phase==='pursuit'){signalStop();updateUI();return;}
 if(phase==='patrol'){
  const step=activeCall?.step;
  if(step){if(dist(player,step.target)<step.range)step.act();}
  else if(dist(player,npc)<40)openConversation('Что происходит?','— Да, пошумел немного. Уже успокоился. Что теперь?');
 }
 else if(phase==='escort'&&dist(player,car)<60&&dist(npc,car)<75){npc.path=[];npc.boardStart={x:npc.x,y:npc.y};loadingPreclose=car.frame===2?.5:0;setPhase('loading');}
 else if((phase==='return'||phase==='readyDepart'||phase==='pursuitReady')&&dist(player,car)<60){const targets=[{x:car.x+25,y:car.y-17},{x:car.x-25,y:car.y-17},{x:car.x-25,y:car.y+11}];[player,...bots].forEach((a,i)=>{a.path=route(a,targets[i].x,targets[i].y);a.boardTarget=targets[i];});boardingClose=-1;boardingAlreadyOpen=car.frame===2;setPhase('boarding');}
 updateUI();
}
function resolve(outcome){modal='';$('dialogue').hidden=true;choice=outcome;player.path=[];marker=null;if(outcome==='warning'){npc.path=route(npc,240,214);setPhase('return');}else{trail=[{x:player.x,y:player.y}];setPhase('escort');}}
function parkNearCall(){
 const target=activeCall?.step?.target||npc;
 const vehicles=(activeCall?.vehicles||[]).filter(v=>v.visible);
 const actors=(activeCall?.actors||[npc]).filter(a=>a.visible);
 const minY=Math.max(target.y+60,...vehicles.filter(v=>Math.abs(v.x-car.x)<64).map(v=>v.y+108));
 // Keep the approach behind parked vehicles and leave room for all three doors.
 for(let y=minY;y<970;y+=4){
  const area={x:car.x-36,y:y-51,w:78,h:99};
  const overlaps=b=>area.x<b.x+b.w&&area.x+area.w>b.x&&area.y<b.y+b.h&&area.y+area.h>b.y;
  if(fixed.some(overlaps)||actors.some(a=>overlaps({x:a.x-12,y:a.y-22,w:24,h:34})))continue;
  car.parkingY=y;return;
 }
 car.parkingY=748;
}
function startCall(){
 updateBriefing();missionId=crypto.randomUUID();
 setScene(selectedCall);
 car.x=scenes[selectedCall].parkingX;car.angle=0;car.route=null;car.driveStarted=false;window.towService?.reset();
 roadMotion.reset({scene:()=>scenes[selectedCall],fixed:()=>[...fixed,...(activeCall?.covers||[])],bodies:()=>[car,...(activeCall?.vehicles||[]).filter(v=>v.visible),...towService.bodies()]});
 const alternate=callStarts[selectedCall]++%2===1;
 try{localStorage.setItem('police-call-variants-v1',JSON.stringify(callStarts.map(n=>n%2)));}catch{}
 [player,...bots].forEach(p=>{p.hp=100;p.pose=null;p.peek=0;p.cover=null;});
 if(selectedCall)activeCall=(selectedCall>=11?createNightCall:selectedCall>=6?createVehicleCall:createCall)(selectedCall,alternate,{
  npc,entity,route,followPath,car,player,bots,fixed:()=>fixed,fail:(copy,result)=>{callResult=copy;callConsequence=result;showCallResult();},yardX:scenes[selectedCall].right,parkingX:scenes[selectedCall].parkingX,yardTop:scenes[selectedCall].yardTop,pursue:beginPursuit,distance:dist,finish:completeCall,detain:escortFromCall,converse:openConversation,
 });
 if(!selectedCall){npc.x=scenes[0].right+24;npc.y=333;}
 parkNearCall();buildMap();
 const lane=roadMotion.lanes().north,start={x:lane,y:1160},turn={x:lane,y:car.parkingY+160},end={x:scenes[selectedCall].parkingX,y:car.parkingY};
 car.route=roadMotion.path(roadMotion.line(start,turn),roadMotion.bend(turn,end));Object.assign(car,start);roadMotion.reserve('patrol');
 for(const actor of activeCall?.actors||[npc]){if(actor.visible&&!free(actor.x,actor.y)){const point=nearest(actor.x,actor.y);if(point)Object.assign(actor,point);}}
 modal='';$('briefing').hidden=true;setPhase('arrival');
}
$('accept').onclick=()=>{
 if($('briefing').hidden||window.stationBase.snapshot().state!=='incoming')return;
 $('briefing').hidden=true;
 window.stationBase.depart(startCall);
};
$('warn').onclick=()=>resolve('warning');$('detain').onclick=()=>resolve('detain');$('listen').onclick=()=>{$('dialogue-copy').textContent='— Поспорил, стал кричать. Переборщил. Сейчас тихо, ни с кем не дерусь.';};$('close-dialogue').onclick=closeConversation;
$('replay').onclick=reset;$('action').onclick=action;
$('doors').onclick=()=>{if(playable()&&dist(player,car)<65){doorTarget=doorTarget===2?0:2;doorTick=0;}};
function pause(value){if(window.stationBase?.snapshot().visible){window.stationBase.setPaused(value);return;}if(!ready||modal)return;paused=value;window.gunshotAudio?.setPaused(value);chaseAudio.setActive(['chaseLaunch','pursuit'].includes(phase)&&!paused);$('pause-layer').hidden=!value;keys.clear();resetJoy();last=0;updateUI();}
$('pause').onclick=()=>pause(!paused);$('resume').onclick=()=>pause(false);$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen?.();}catch{}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});window.addEventListener('blur',()=>pause(true));
window.addEventListener('keydown',e=>{if(fleet.isOpen())return;const k=e.key.toLowerCase();if(['w','a','s','d','ц','ф','ы','в','arrowup','arrowdown','arrowleft','arrowright','e','у'].includes(k)){e.preventDefault();keys.add(k);if((k==='e'||k==='у')&&!e.repeat)action();}if(k==='escape'&&!e.repeat){if(modal==='dialogue'){$('close-dialogue').click();}else pause(!paused);}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const joy=$('joystick'),stick=$('stick');function resetJoy(){joyX=0;joyY=0;joyPointer=null;stick.style.transform='translate(0,0)';}
function joyMove(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),max=r.width*.3,k=len>max?max/len:1;joyX=dx*k/max;joyY=dy*k/max;stick.style.transform=`translate(${dx*k}px,${dy*k}px)`;}
joy.onpointerdown=e=>{if(playable()){joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);}};joy.onpointermove=e=>{if(e.pointerId===joyPointer)joyMove(e);};joy.onpointerup=resetJoy;joy.onpointercancel=resetJoy;joy.onlostpointercapture=resetJoy;
canvas.onpointerdown=e=>{if(!playable()||phase==='pursuit')return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/camera.scale+camera.x,y=(e.clientY-r.top)/camera.scale+camera.y;clickInfo={x,y,free:free(x,y)};if(!free(x,y))return;player.path=route(player,x,y);clickInfo.pathLength=player.path.length;marker=player.path.length?{x,y}:null;canvas.focus({preventScroll:true});};
function beginPursuit(enemy,done){
 pendingPursuit={enemy,done,signals:0,cooldown:0};setPhase('pursuitReady');
 player.path=[];marker=null;
}
function signalStop(){
 if(phase!=='pursuit'||!pendingPursuit)return;
 if(highSpeedChase.signal()){const s=highSpeedChase.snapshot();pendingPursuit.signals=s.signals;if(s.result===true)endPursuit(true);}
}
function endPursuit(caught){
 const p=pendingPursuit,ending=highSpeedChase.finish(map,img),enemy=p.enemy;
 roadMotion.release(enemy.exitId);roadMotion.release('chaseLaunch');towService.reset();
 Object.assign(car,ending.car,{route:null,frame:0,driveStarted:false});Object.assign(enemy,ending.enemy,{visible:caught,driveAway:false,exitRoute:null,exitStarted:false,angle:0});
 props.length=0;blocks.length=0;fixed.length=0;fixed.push({x:0,y:0,w:scenes[selectedCall].left,h:H},...ending.solids);
 roadMotion.reset({scene:()=>scenes[selectedCall],fixed:()=>fixed,bodies:()=>[car,...(activeCall?.vehicles||[]).filter(v=>v.visible),...towService.bodies()]});
 Object.assign(camera,ending.camera,{holdFrames:1});$('call-location').textContent='НОВЫЙ КВАРТАЛ · '+Math.round(ending.distance*.2)+' М ОТ НАЧАЛА ПОГОНИ';player.x=car.x;player.y=car.y;
 afterExit=()=>p.done(caught,caught?'stopped':'escaped');pendingPursuit=null;setPhase('exiting');
}
function launchPursuit(){
 const start={x:car.x,y:car.y},merge={x:roadMotion.lanes().north,y:car.y-180};
 car.route=roadMotion.path(roadMotion.bend(start,merge));car.driveStarted=false;roadMotion.reserve('chaseLaunch');setPhase('chaseLaunch');
}
let noticeKey='',noticeUntil=0;
function updateObjectiveNotice(){
 const el=$('objective-notice');
 const covered=paused||!!modal||!$('briefing').hidden||!$('result').hidden||window.stationBase.snapshot().visible;
 if(covered){el.classList.remove('is-visible');if(phase==='briefing')noticeKey='';return;}
 const key=selectedCall+'|'+$('objective').textContent;
 if(key!==noticeKey){noticeKey=key;noticeUntil=clock+Math.min(8,Math.max(4.5,$('objective').textContent.length*.075));}
 el.classList.toggle('is-visible',clock<noticeUntil);
}
function updateUI(){
 const squad=[player,...bots];document.querySelector('#officer-health').hidden=!squad.some(p=>p.visible);
 document.querySelector('#officer-health').innerHTML=squad.map((p,i)=>'<span>'+(['ВЫ','АЛЬФА','БРАВО'][i])+' <b>'+Math.ceil(p.hp)+'</b><i style="width:'+p.hp+'%;background:'+(p.hp<35?'#d7795f':'#a6bd86')+'"></i></span>').join('');
 document.querySelector('#combat-cover').hidden=!activeCall?.combat;document.querySelector('#combat-target').hidden=!activeCall?.combat;

 const texts={briefing:'НОВЫЙ ВЫЗОВ',arrival:'ПРИБЫТИЕ НА МЕСТО',exiting:'ОТРЯД ВЫХОДИТ',patrol:'ПОДОЙДИ И ПОГОВОРИ',escort:'СОПРОВОДИ К МАШИНЕ',loading:'ПОСАДКА В МАШИНУ',readyDepart:'ДОСТАВИТЬ В ОТДЕЛ',return:'ВЕРНИСЬ К МАШИНЕ',boarding:'ОТРЯД САДИТСЯ',departing:'ВОЗВРАЩЕНИЕ',complete:'ВЫЗОВ ЗАВЕРШЁН',pursuitReady:'САДИСЬ В МАШИНУ ДЛЯ ПОГОНИ',chaseLaunch:'ВЫЕЗЖАЕМ В ПРЕСЛЕДОВАНИЕ',pursuit:'ДОГОНИ НАРУШИТЕЛЯ',pursuitStop:'ОСТАНАВЛИВАЕМСЯ'};
 const step=phase==='patrol'?activeCall?.step:null;
 $('objective').textContent=phase==='departing'&&!car.driveStarted&&towService.snapshot().jobs.length?'ЖДЁМ ЭВАКУАТОР · ОСВОБОЖДАЕТ ВЫЕЗД':step?.instruction||texts[phase];$('status').textContent=phase==='pursuit'?'ПОГОНЯ · '+pendingPursuit.signals+' / 2':activeCall?.status||(choice==='detain'?'СОПРОВОЖДЕНИЕ':'БЕЗ ПЕРЕСТРЕЛКИ');
 const target=phase==='patrol'?(step?.target||npc):car;$('distance').textContent=['patrol','escort','return','readyDepart','pursuitReady'].includes(phase)?Math.round(dist(player,target)/16)+' М ДО '+(phase==='patrol'?'МЕСТА':'МАШИНЫ'):'';
 let label='ПОДОЙТИ',enabled=false;
 if(phase==='patrol'){label=step?.label||'ГОВОРИТЬ';enabled=dist(player,target)<(step?.range||40);}if(phase==='escort'){label='ПОСАДИТЬ';enabled=dist(player,car)<60&&dist(npc,car)<75;}
 if(phase==='pursuitReady'){label='СЕСТЬ В МАШИНУ';enabled=dist(player,car)<60;}
 if(phase==='pursuit'){const s=highSpeedChase.snapshot();label=s.mode==='chase'?'ПОТРЕБОВАТЬ ОСТАНОВИТЬСЯ':'ОСТАНОВКА';enabled=s.canSignal;
 $('distance').textContent=s.kmh+' КМ/Ч · '+Math.round(Math.max(0,s.gap)*.2)+' М ДО ЦЕЛИ';
 $('objective').textContent=s.mode==='yield'?'ВОДИТЕЛЬ СЪЕЗЖАЕТ К ОБОЧИНЕ':s.mode==='overtake'?'ОБЪЕЗЖАЕМ · ПАРКУЕМСЯ ВПЕРЕДИ':s.mode==='settled'?'ПУТЬ ПЕРЕКРЫТ · ВЫХОДИМ':s.mode==='lost'?'УШЁЛ ИЗ ВИДУ · ПРЕКРАЩАЕМ ПОГОНЮ':s.signals?'ИГНОРИРУЕТ ТРЕБОВАНИЕ · ПОВТОРИ':s.canSignal?'ВОДИТЕЛЬ РЯДОМ · ПОДАЙ ТРЕБОВАНИЕ':'ДОГОНИ · ВВЕРХ ГАЗ, ВНИЗ ТОРМОЗ';
 $('status').textContent='ПРОЙДЕНО '+Math.round(s.distance*.2)+' М · ТРЕБОВАНИЯ '+s.signals+'/2';}
 if(phase==='return'){label='ЗАВЕРШИТЬ';enabled=dist(player,car)<60;}if(phase==='readyDepart'){label='В ОТДЕЛ';enabled=dist(player,car)<60;}
 if(['arrival','exiting','loading','boarding','departing','chaseLaunch'].includes(phase))label='ПОДОЖДИ';
 if(activeCall?.combat)$('distance').textContent='АВТООГОНЬ · В УКРЫТИЕ · ДРУГАЯ ЦЕЛЬ';
 $('action-text').textContent=label;$('action').disabled=!enabled||!playable();
 $('doors').hidden=!!activeCall?.combat||!playable()||!['patrol','return','readyDepart'].includes(phase)||dist(player,car)>=65;$('doors').textContent=doorTarget===2?'ЗАКРЫТЬ ДВЕРИ':'ОТКРЫТЬ ДВЕРИ';
 updateObjectiveNotice();
}
function autoDoors(open){if(open)car.frame=time<.25?1:2;else car.frame=time<.25?1:0;}
function update(dt){
 clock+=dt;time+=dt;player.moving=false;if(!['briefing','baseReturn','complete','pursuit','pursuitStop'].includes(phase))roadMotion.update(dt);if(!['pursuit','pursuitStop'].includes(phase))activeCall?.animate?.(dt);
 if(phase==='arrival'){if(roadMotion.advance(car,car.route,dt,180)){car.route=null;roadMotion.release('patrol');setPhase('exiting');}}
 else if(phase==='chaseLaunch'){
  if(!car.driveStarted&&pendingPursuit.enemy.y<car.y-130&&roadMotion.ready(car,car.route))car.driveStarted=true;
  if(car.driveStarted&&roadMotion.advance(car,car.route,dt,110)){
   const enemy=pendingPursuit.enemy;roadMotion.clearTraffic();
   highSpeedChase.start(enemy.model,{car,enemy,scene:scenes[selectedCall],map,camera});car.route=null;setPhase('pursuit');
  }
 }
 else if(phase==='pursuit'){
  let dx=joyX,dy=joyY;if(keys.has('a')||keys.has('ф')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('в')||keys.has('arrowright'))dx++;if(keys.has('w')||keys.has('ц')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('ы')||keys.has('arrowdown'))dy++;
  highSpeedChase.update(dt,dx,dy);const s=highSpeedChase.snapshot();pendingPursuit.signals=s.signals;pendingPursuit.cooldown=s.cooldown;
  car.frame=0;if(s.result!==null)endPursuit(s.result);
 }else if(phase==='exiting'){
  car.frame=time<.22?1:time<2.3?2:time<2.55?1:0;
  [player,...bots].forEach((a,i)=>{const start=[{x:car.x+18,y:car.y-18},{x:car.x-18,y:car.y-18},{x:car.x-18,y:car.y+9}][i],end=[{x:car.x+36,y:car.y-6},{x:car.x-27,y:car.y-12},{x:car.x-27,y:car.y+21}][i],t=Math.max(0,Math.min(1,(time-.6-i*.18)/.65));a.visible=time>.6+i*.18;a.x=start.x+(end.x-start.x)*t;a.y=start.y+(end.y-start.y)*t;a.moving=t>0&&t<1;a.face=end.x>start.x?1:-1;});
  if(time>2.75){doorTarget=0;trail=[{x:player.x,y:player.y}];setPhase('patrol');if(afterExit){const cb=afterExit;afterExit=null;cb();}}
 }else if(['patrol','escort','return','readyDepart','pursuitReady'].includes(phase)){
  doorTick+=dt;if(doorTick>.2&&car.frame!==doorTarget){car.frame+=Math.sign(doorTarget-car.frame);doorTick=0;}
  let dx=joyX,dy=joyY;if(keys.has('a')||keys.has('ф')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('в')||keys.has('arrowright'))dx++;if(keys.has('w')||keys.has('ц')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('ы')||keys.has('arrowdown'))dy++;
  const len=Math.hypot(dx,dy);if(len>.08){player.path=[];marker=null;const k=86*dt/Math.max(1,len);move(player,dx*k,dy*k);}else followPath(player,dt,86);if(!player.path.length)marker=null;
  if(!trail.length||dist(player,trail[trail.length-1])>7){trail.push({x:player.x,y:player.y});if(trail.length>80)trail.shift();}
  if(!activeCall?.controlsSquad){repath-=dt;if(repath<=0){repath=.25;bots.filter(a=>a.hp>0).forEach(planCompanion);}
  bots.filter(a=>a.hp>0).forEach(a=>{const gap=dist(a,player),speed=gap>80?150:gap>45?128:100;followPath(a,dt,speed);});}
  if(phase==='patrol'&&activeCall)activeCall.update(player,dt);
  if(phase==='escort')moveEscort(dt);else if(choice==='warning'&&!released){followPath(npc,dt,54);if(dist(npc,{x:240,y:214})<8){npc.visible=false;released=true;}}
 }else if(phase==='loading'){
  const lt=time-loadingPreclose;if(lt<0){car.frame=time<.25?1:0;return;}car.frame=lt<.25?4:lt<2.05?5:lt<2.3?4:3;
  const t=Math.max(0,Math.min(1,(lt-.5)/1.2));npc.x=npc.boardStart.x+(car.x+20-npc.boardStart.x)*t;npc.y=npc.boardStart.y+(car.y+6-npc.boardStart.y)*t;npc.moving=t>0&&t<1;npc.face=-1;if(lt>1.75)npc.visible=false;
  if(lt>2.5){inCar=true;car.frame=0;doorTarget=0;setPhase('readyDepart');}
 }else if(phase==='boarding'){
  if(boardingClose<0){if(boardingAlreadyOpen)car.frame=2;else autoDoors(true);if(time>.5)[player,...bots].forEach(a=>{if(!a.visible)return;followPath(a,dt,86);if(dist(a,a.boardTarget)<6)a.visible=false;});if([player,...bots].every(a=>!a.visible))boardingClose=time;}
  else{const t=time-boardingClose;car.frame=t<.2?2:t<.45?1:0;if(t>.7){if(pendingPursuit){activeCall.actors.forEach(a=>a.visible=false);launchPursuit();}else setPhase('departing');}}
  }else if(phase==='departing'){
  if(!car.route){roadMotion.reserve('patrol');const start={x:car.x,y:car.y},merge={x:roadMotion.lanes().north,y:car.y+160};car.route=roadMotion.path(roadMotion.bend(start,merge,true),roadMotion.line(merge,{x:merge.x,y:-130}));car.driveStarted=false;}
  if(roadMotion.ready(car,car.route)&&!towService.snapshot().jobs.length)car.driveStarted=true;
  if(car.driveStarted&&roadMotion.advance(car,car.route,dt,110)){car.route=null;roadMotion.release('patrol');setPhase('baseReturn');modal='baseReturn';window.stationBase.arrive(choice==='detain',showCallResult);}}
 updateUI();
}
function tile(key,x,y,w=16,h=16,context=mg){context.drawImage(img[key],x,y,w,h);}
function buildMap(){
 mg.clearRect(0,0,W,H);
 mg.imageSmoothingEnabled=false;
 for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){const hash=((x*17+y*31)>>>2)%29;tile('road'+(hash<8?hash+1:6),x,y);}
 const scene=scenes[selectedCall];
 const onBlock=y=>scene.bands.some(([top,height])=>y>=top&&y<top+height);
 for(let y=0;y<H;y+=16)if(onBlock(y+8)){
  for(const x of [scene.left,scene.left+16,scene.right-32,scene.right-16])tile('pave'+(1+((x+y*3)%12)),x,y);
  tile('curb11',scene.left+24,y,8,16);tile('curb13',scene.right-32,y,8,16);
 }
 for(let y=0;y<H;y+=48)if(onBlock(y)){mg.save();mg.translate(selectedCall>=11?138:191,y);mg.rotate(Math.PI/2);tile('line3',0,0,20,3);mg.restore();}
 for(let i=0;i<scene.bands.length-1;i++){
  const upper=scene.bands[i][0]+scene.bands[i][1],lower=scene.bands[i+1][0];
  for(let x=0;x<W;x+=16){tile('pave2',x,upper);tile('pave6',x,lower-16);tile('curb19',x,upper+13,16,4);tile('curb16',x,lower-16,16,4);}
  for(let x=scene.left+32;x<scene.right-32;x+=16){tile('pave6',x,upper-14,8,24);tile('pave6',x,lower-8,8,24);}
 }
 // A paved building forecourt is distinct from the asphalt travel lanes.
 for(let y=scene.yardTop;y<scene.yardBottom;y+=16)for(let x=scene.right-32;x<W;x+=16)tile('pave2',x,y);
 for(let y=scene.yardTop;y<scene.yardBottom;y+=16)if(y<car.parkingY-40||y>car.parkingY+100)tile('curb13',scene.right-32,y,8,16);
 for(const b of blocks){
  mg.save();mg.beginPath();mg.rect(b.x,b.y,b.w,b.h);mg.clip();
  for(let y=b.y;y<b.y+b.h;y+=16)for(let x=b.x;x<b.x+b.w;x+=16)tile('roof'+(((x+y)%5===0)?8:6),x,y);
  const front=b.y+b.h,variant=b.x===0&&selectedCall!==10;
  if(variant)mg.drawImage(img.atlas,16,144,128,192,b.x,front-116,b.w,116);else mg.drawImage(img.atlas,192,192,176,144,b.x,front-86,b.w,86);
  mg.strokeStyle='#242a2e';mg.lineWidth=3;mg.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);mg.restore();
 }
 for(const p of props)tile(p.key,p.x,p.y,p.w,p.h);
 // Apply one restrained grade to existing pack art; do not replace its sprites.
 mg.fillStyle='#102b25';mg.globalAlpha=.19;mg.fillRect(0,0,W,H);mg.globalAlpha=1;
}
function drawActor(a){
 if(!a.visible)return;
 if(a.serviceSprite!==undefined){drawService(a.serviceSprite,a.x,a.y-12,22,30,a.moving?Math.sin(clock*14)*.025:0);return;}
 const civilian=a.kind==='resident';
 const key=a.pose||(civilian?'armedSurrender':a.kind+(a.moving?'Walk':'Idle'));
 const im=img[key];
 const interval=a.moving||a.pose==='npcStrike' ? .13 : .35;
 const f=a.pose==='armedDead'?im.width/32-1:civilian||a.pose==='armedSurrender' ? 0 : Math.floor(clock/interval)%(im.width/32);
 g.save();g.translate(Math.round(a.x),Math.round(a.y));if(a.face<0)g.scale(-1,1);
 g.drawImage(im,f*32,0,32,32,-16,-28,32,32);g.restore();
}
function drawCar(){const im=img['car_'+fleet.selected()],cw=im.width/3,ch=im.height/2,i=car.frame===3?0:car.frame;g.save();g.translate(car.x,car.y);g.rotate(car.angle||0);g.drawImage(im,(i%3)*cw+4,Math.floor(i/3)*ch+4,cw-8,ch-8,-30,-45,60,90);g.restore();}
function drawService(cell,x,y,w,h,angle=0){
 const im=img.serviceAtlas;if(!im._regions){const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const cx=cv.getContext('2d');cx.drawImage(im,0,0);const d=cx.getImageData(0,0,im.width,im.height).data;im._regions=[];for(let k=0;k<4;k++){const sx=k%2*im.width/2,sy=Math.floor(k/2)*im.height/2;let l=im.width,r=0,t=im.height,b=0;for(let y=sy;y<sy+im.height/2;y++)for(let x=sx;x<sx+im.width/2;x++)if(d[(y*im.width+x)*4+3]>80){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}im._regions.push([l,t,r-l+1,b-t+1]);}}
 g.save();g.translate(x,y);g.rotate(angle);g.drawImage(im,...im._regions[cell],-w/2,-h/2,w,h);g.restore();
}
function drawEnemyCar(v){
 if(v.serviceSprite!==undefined){drawService(v.serviceSprite,v.x,v.y,60,90,v.angle||0);return;}
 if(v.police){const im=img['car_'+v.model],cw=im.width/3,ch=im.height/2,i=v.frame||0;g.save();g.translate(v.x,v.y);g.rotate(v.angle||0);g.drawImage(im,(i%3)*cw+4,Math.floor(i/3)*ch+4,cw-8,ch-8,-30,-45,60,90);g.restore();highSpeedChase.lights(g,v.x,v.y,clock);return;}
 const im=img['enemy_'+v.model],cw=im.width/3,ch=im.height/2,i=v.frame;
 g.save();g.translate(v.x,v.y);g.rotate(v.angle||0);g.drawImage(im,(i%3)*cw+4,Math.floor(i/3)*ch+4,cw-8,ch-8,-30,-45,60,90);if(v.model==='cargo'&&v.frame>=4&&v.cargo!==false)g.drawImage(img.object12,-5,24,10,10);g.restore();
}
function resize(){const r=canvas.getBoundingClientRect();camera.w=r.width;camera.h=r.height;camera.dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*camera.dpr);canvas.height=Math.round(r.height*camera.dpr);}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
function render(){
 if(phase==='pursuit'){highSpeedChase.draw(display,img,fleet.selected(),camera);return;}
 if(world.height!==H)world.height=H;
 const target=['briefing','arrival','exiting','boarding'].includes(phase)?car:['departing','pursuit','pursuitStop','chaseLaunch'].includes(phase)?car:player;
 const holdCamera=camera.holdFrames>0;if(holdCamera)camera.holdFrames--;else camera.scale+=(Math.max(camera.w/384,camera.h/640)-camera.scale)*.12;const vw=camera.w/camera.scale,vh=camera.h/camera.scale;if(!holdCamera){camera.x+=(Math.max(0,Math.min(W-vw,target.x-vw/2))-camera.x)*.12;camera.y+=(Math.max(0,Math.min(H-vh,target.y-vh*.68))-camera.y)*.12;}
 g.imageSmoothingEnabled=false;g.drawImage(map,0,0);
 if(marker){g.strokeStyle='#c5c999';g.lineWidth=1;g.beginPath();g.ellipse(marker.x,marker.y,5,2,0,0,Math.PI*2);g.stroke();}
 const prop=activeCall?.prop;if(prop)tile(prop.key,prop.x,prop.y,prop.w,prop.h,g);
 const objectiveTarget=activeCall?.step.target||npc;
 if(phase==='patrol'){g.strokeStyle='#d7b582';g.lineWidth=1;g.beginPath();g.ellipse(objectiveTarget.x,objectiveTarget.y+1,13,5,0,0,Math.PI*2);g.stroke();g.fillStyle='#e6c68f';g.font='bold 8px monospace';g.textAlign='center';g.fillText('!',objectiveTarget.x,objectiveTarget.y-(objectiveTarget.kind?27:13));}
 const actors=[player,...bots,...(activeCall?.actors||[npc])];
 roadMotion.draw(g,img);
 const layers=[{y:car.y+25,draw:drawCar},...(activeCall?.vehicles||[]).filter(v=>v.visible).map(v=>({y:v.y+25,draw:()=>drawEnemyCar(v)})),...(activeCall?.covers||[]).map(c=>({y:c.y+c.h,draw:()=>tile(c.key,c.x,c.y,c.w,c.h,g)})),...actors.filter(a=>a.visible).map(a=>({y:a.y,draw:()=>drawActor(a)}))];layers.sort((a,b)=>a.y-b.y).forEach(x=>x.draw());
 window.towService?.draw(g,drawEnemyCar);
 for(const e of activeCall?.effects||[]){g.strokeStyle=e.color||'#f4c471';g.lineWidth=1;g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.tx,e.ty);g.stroke();}
 if(phase==='pursuitStop'||phase==='chaseLaunch'||activeCall?.combat)highSpeedChase.lights(g,car.x,car.y,clock);
 if(player.visible){g.strokeStyle='#abb680';g.lineWidth=1;g.beginPath();g.ellipse(player.x,player.y+1,9,3,0,0,Math.PI*2);g.stroke();}
 patrolShift.light(g,car,[player,...bots],clock);activeCall?.draw?.(g);
 const z=camera.dpr*camera.scale;display.setTransform(z,0,0,z,-camera.x*z,-camera.y*z);display.imageSmoothingEnabled=false;display.drawImage(world,0,0);
 if(phase==='pursuitStop'&&time<.35){display.save();display.setTransform(1,0,0,1,0,0);display.fillStyle='rgba(10,22,18,'+(1-time/.35)+')';display.fillRect(0,0,canvas.width,canvas.height);display.restore();}
 // Edge indicator keeps the active objective readable without zooming the world out.
 if(['patrol','escort','return','readyDepart'].includes(phase)){const obj=phase==='patrol'?objectiveTarget:car,px=(obj.x-camera.x)*camera.scale,py=(obj.y-camera.y)*camera.scale;if(py<205||py>camera.h-150||px<24||px>camera.w-24){const sx=Math.max(30,Math.min(camera.w-30,px)),sy=Math.max(225,Math.min(camera.h-175,py));display.setTransform(camera.dpr,0,0,camera.dpr,0,0);display.fillStyle='#d7bd88';display.font='bold 18px monospace';display.textAlign='center';display.fillText(py<205?'▲':'▼',sx,sy);display.font='bold 10px monospace';display.fillText(phase==='patrol'?'ВЫЗОВ':'МАШИНА',sx,sy+14);}}
}
function loop(now){const dt=last?Math.min(.04,(now-last)/1000):0;last=now;if(ready){chaseAudio.setActive(['chaseLaunch','pursuit'].includes(phase)&&!paused&&!modal);if(!paused&&!modal)update(dt);render();}requestAnimationFrame(loop);}
async function load(){try{await Promise.all(Object.entries(sources).map(([key,file])=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{img[key]=im;res();};im.onerror=()=>rej(new Error(file));im.src='street-assets/'+file;})));ready=true;$('loading').hidden=true;reset();requestAnimationFrame(loop);}catch(e){$('loading-copy').textContent='Графика не загрузилась. Обновите страницу.';console.error(e);}}
window.street={skipArrival:()=>{if(phase!=='arrival')return;const end=car.route.pts.at(-1);Object.assign(car,{x:end.x,y:end.y,angle:end.angle,waiting:false,frame:0,route:null});roadMotion.release('patrol');setPhase('exiting');time=3;update(0);render();},snapshot:()=>({ready,paused,modal,phase,time,choice,inCar,released,clickInfo,selectedCall,shift:patrolShift.snapshot(),combat:activeCall?.snapshot?.(),health:[player,...bots].map(p=>p.hp),enemyVehicles:(activeCall?.vehicles||[]).map(v=>({...v})),pursuitSignals:pendingPursuit?.signals,chase:phase==='pursuit'?highSpeedChase.snapshot():null,vehicleModel:fleet.selected(),objective:activeCall?.step?{x:activeCall.step.target.x,y:activeCall.step.target.y,label:activeCall.step.label}:null,player:{x:player.x,y:player.y,visible:player.visible,pathLength:player.path.length},bots:bots.map(a=>({x:a.x,y:a.y,visible:a.visible})),npc:{x:npc.x,y:npc.y,visible:npc.visible},car:{x:car.x,y:car.y,angle:car.angle,frame:car.frame,parkingY:car.parkingY,waiting:car.waiting},traffic:roadMotion.snapshot(),tow:towService.snapshot(),camera:{...camera},playerIsFree:free(player.x,player.y)})};
load();

function showCallResult(){setPhase('complete');modal='result';$('result-title').textContent=callConsequence.failed?'ОТРЯД ЭВАКУИРОВАН':callConsequence.dead?'ЧЕЛОВЕК ПОГИБ':choice==='detain'?'ДОСТАВЛЕН В ОТДЕЛ':callConsequence.escaped?'ВОДИТЕЛЬ СКРЫЛСЯ':callConsequence.shots?'ВЫЗОВ ЗАВЕРШЁН':'ВОПРОС РЕШЁН МИРНО';$('result-copy').textContent=callResult||(choice==='detain'?'Нарушитель доставлен в отдел до дальнейшего выяснения.':'Нарушитель получил предупреждение и ушёл. Жалоба на шум отработана.');$('result-human-label').textContent=callConsequence.dead?'Погибшие':'Пострадавшие';$('result-human-count').textContent=String(callConsequence.dead||callConsequence.injured||0);$('result-shots').textContent=String(callConsequence.shots||0);const earned=callConsequence.escaped||callConsequence.failed?0:fleet.reward(missionId);$('result-reward').textContent='НАГРАДА · +'+earned+' монет · Баланс '+fleet.snapshot().balance+(fleet.snapshot().storageOK?'':' · не сохранено на устройстве');$('result').hidden=false;document.querySelector('.result-lines b').textContent=(3-(callConsequence.officersDown||0))+' / 3';patrolShift.complete(missionId);document.querySelector('#result-copy').textContent+=(callConsequence.neutralized?' Устранено вооружённых угроз: '+callConsequence.neutralized+'.':'')+(callConsequence.civilianDead?' Погибло жителей: '+callConsequence.civilianDead+'.':'');}

document.querySelector('#combat-cover').onclick=()=>{if(playable())activeCall?.takeCover?.();};document.querySelector('#combat-target').onclick=()=>{if(playable())activeCall?.cycle?.();};

window.addEventListener("message",event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==="patrol:exit")pause(true);});
