'use strict';
const M=window.SPRITES.assets,images={},canvas=document.getElementById('game'),screen=canvas.getContext('2d');
const world=document.createElement('canvas');world.width=384;world.height=704;const ctx=world.getContext('2d');
M.player_walk={file:'assets/original/player-walk.png'};M.player_idle={file:'assets/original/player-idle.png'};
const ui={state:document.getElementById('state'),hint:document.getElementById('hint'),action:document.getElementById('action'),text:document.getElementById('action-text'),icon:document.getElementById('action-icon')};
const seat={x:229,y:331},landing={x:233,y:354};
const walls={left:33,right:351,top:155,bottom:649};
const obstacles=[{x:164,y:307,w:56,h:31},{x:185,y:284,w:14,h:10},{x:141,y:324,w:16,h:12},{x:228,y:324,w:16,h:12}];
const player={x:seat.x,y:seat.y,mode:'seated',time:0,face:-1,path:[],moving:false};
const input={keys:new Set(),x:0,y:0,pointer:null};
let ready=false,paused=false,last=0,clock=0,marker=null,flash=0;
const camera={x:0,y:0,scale:1,width:768,height:768,dpr:1};
function resize(){const r=canvas.getBoundingClientRect();camera.width=r.width;camera.height=r.height;camera.dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(r.width*camera.dpr);canvas.height=Math.round(r.height*camera.dpr);}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
function updateCamera(){camera.scale=Math.max(camera.width/384,camera.height/704);const vw=camera.width/camera.scale,vh=camera.height/camera.scale;camera.x=Math.max(0,Math.min(384-vw,player.x-vw/2));camera.y=Math.max(0,Math.min(704-vh,player.y-28-vh/2));}
const radius=5,speed=78;
function isFree(x,y){return x>=walls.left&&x<=walls.right&&y>=walls.top&&y<=walls.bottom&&!obstacles.some(r=>x+radius>r.x&&x-radius<r.x+r.w&&y+radius>r.y&&y-radius<r.y+r.h);}
function move(dx,dy){if(isFree(player.x+dx,player.y))player.x+=dx;if(isFree(player.x,player.y+dy))player.y+=dy;}
function route(x,y){
 if(!isFree(x,y))return [];
 const step=8,cols=40,rows=62,ox=33,oy=155;
 const point=i=>({x:ox+(i%cols)*step,y:oy+Math.floor(i/cols)*step});
 const closest=(x,y)=>{let best=-1,dist=Infinity;for(let i=0;i<cols*rows;i++){const p=point(i);if(!isFree(p.x,p.y))continue;const d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;best=i;}}return best;};
 const start=closest(player.x,player.y),end=closest(x,y);if(start<0||end<0)return [];
 const queue=[start],parents=new Map([[start,-1]]);
 for(let n=0;n<queue.length&&!parents.has(end);n++){const curr=queue[n],cx=curr%cols,cy=Math.floor(curr/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=cols||ny<0||ny>=rows)continue;const next=ny*cols+nx,p=point(next);if(!parents.has(next)&&isFree(p.x,p.y)){parents.set(next,curr);queue.push(next);}}}
 if(!parents.has(end))return [];
 const path=[];for(let i=end;i!==-1;i=parents.get(i))path.push(point(i));path.reverse();path.push({x,y});return path;
}
function nearSeat(){return Math.hypot(player.x-landing.x,player.y-landing.y)<23;}
function act(){if(!ready||paused)return;if(player.mode==='seated'){player.mode='rising';player.time=0;}else if(player.mode==='standing'&&nearSeat()){player.path=[];marker=null;player.mode='returning';player.time=0;player.returnFrom={x:player.x,y:player.y};}updateUI();}
function updateUI(){
 const mode=player.mode,canSit=mode==='standing'&&nearSeat();
 ui.action.disabled=!ready||paused||!((mode==='seated')||canSit);
 ui.text.textContent=mode==='seated'?'ВСТАТЬ':canSit?'СЕСТЬ':mode==='standing'?'К МЕСТУ':'ПОДОЖДИ';
 ui.icon.textContent=mode==='seated'?'↑':canSit?'↓':'·';
 ui.state.textContent='ОЖИДАНИЕ ЗАЯВКИ';
 ui.hint.textContent=mode==='seated'?'ВСТАНЬ И ОСМОТРИСЬ В УЧАСТКЕ':mode==='standing'?(canSit?'МОЖНО ВЕРНУТЬСЯ ЗА СТОЛ':'ОСМОТР УЧАСТКА · НАПАРНИКИ ЖДУТ'):'КОМНАТА ОЖИДАНИЯ';
}
function pause(value){if(!ready)return;paused=value;document.getElementById('paused').hidden=!paused;document.getElementById('pause').textContent=paused?'▶':'Ⅱ';document.getElementById('pause').setAttribute('aria-label',paused?'Продолжить':'Поставить на паузу');input.keys.clear();resetStick();last=0;updateUI();}
document.getElementById('pause').onclick=()=>pause(!paused);document.getElementById('resume').onclick=()=>pause(false);ui.action.onclick=act;
document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{ui.hint.textContent='Игра уже занимает всю доступную область окна.';}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('blur',()=>{if(ready)pause(true);});
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['w','a','s','d','ц','ф','ы','в','arrowup','arrowdown','arrowleft','arrowright','e','у',' '].includes(key)){if(e.target.tagName!=='BUTTON')e.preventDefault();input.keys.add(key);if((key==='e'||key==='у')&&!e.repeat)act();}if(key==='escape'&&!e.repeat)pause(!paused);});
window.addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
const joy=document.getElementById('joystick'),stick=document.getElementById('stick');
function resetStick(){input.pointer=null;input.x=0;input.y=0;stick.style.transform='translate(0px,0px)';}
function joystick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.31,len=Math.hypot(dx,dy),scale=len>max?max/len:1;input.x=dx*scale/max;input.y=dy*scale/max;stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
joy.addEventListener('pointerdown',e=>{if(paused)return;input.pointer=e.pointerId;joy.setPointerCapture(e.pointerId);joystick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===input.pointer)joystick(e);});joy.addEventListener('pointerup',resetStick);joy.addEventListener('pointercancel',resetStick);joy.addEventListener('lostpointercapture',resetStick);
canvas.addEventListener('pointerdown',e=>{if(!ready||paused||player.mode!=='standing')return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/camera.scale+camera.x,y=(e.clientY-r.top)/camera.scale+camera.y;const path=route(x,y);if(path.length){player.path=path;marker={x,y};}else{flash=.35;}canvas.focus({preventScroll:true});});
function prop(name,x,y,w,h,flip=false){const [sx,sy,sw,sh]=M[name].frames[0];ctx.save();if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);x=0;y=0;}ctx.drawImage(images[name],sx,sy,sw,sh,Math.round(x),Math.round(y),w,h);ctx.restore();}
function actor(name,x,y,height,frame,flip=false,bob=0){const [sx,sy,sw,sh]=M[name].frames[frame],scale=height/M[name].frames[5][3],w=sw*scale,h=sh*scale;ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));if(flip)ctx.scale(-1,1);ctx.drawImage(images[name],sx,sy,sw,sh,Math.round(-w/2),Math.round(-h),Math.round(w),Math.round(h));ctx.restore();}
function smooth(t){return t*t*(3-2*t);}
function update(dt){
 clock+=dt;player.time+=dt;flash=Math.max(0,flash-dt);player.moving=false;
 if(player.mode==='rising'&&player.time>=.76){player.mode='leaving';player.time=0;}
 if(player.mode==='leaving'){const t=smooth(Math.min(1,player.time/.36));player.x=seat.x+(landing.x-seat.x)*t;player.y=seat.y+(landing.y-seat.y)*t;if(t===1){player.mode='standing';player.time=0;}}
 if(player.mode==='returning'){const t=smooth(Math.min(1,player.time/.4));player.x=player.returnFrom.x+(seat.x-player.returnFrom.x)*t;player.y=player.returnFrom.y+(seat.y-player.returnFrom.y)*t;player.face=-1;if(t===1){player.mode='sitting';player.time=0;}}
 if(player.mode==='sitting'&&player.time>=.76){player.mode='seated';player.time=0;}
 if(player.mode==='standing'){
  let dx=input.x,dy=input.y;const k=input.keys;
  if(k.has('a')||k.has('ф')||k.has('arrowleft'))dx-=1;if(k.has('d')||k.has('в')||k.has('arrowright'))dx+=1;
  if(k.has('w')||k.has('ц')||k.has('arrowup'))dy-=1;if(k.has('s')||k.has('ы')||k.has('arrowdown'))dy+=1;
  const magnitude=Math.hypot(dx,dy);
  if(magnitude>.08){player.path=[];marker=null;const scale=speed*dt/Math.max(1,magnitude);const before={x:player.x,y:player.y};move(dx*scale,dy*scale);player.moving=Math.hypot(player.x-before.x,player.y-before.y)>.1;}
  else if(player.path.length){const target=player.path[0];dx=target.x-player.x;dy=target.y-player.y;const len=Math.hypot(dx,dy);if(len<.05){player.x=target.x;player.y=target.y;player.path.shift();if(!player.path.length)marker=null;}else{const step=Math.min(speed*dt,len),bx=player.x,by=player.y;move(dx/len*step,dy/len*step);player.moving=Math.hypot(player.x-bx,player.y-by)>.05;if(!player.moving){player.path=[];marker=null;}}}
  if(Math.abs(dx)>.1)player.face=dx<0?-1:1;
 }
 updateUI();
}
function room(){
 ctx.fillStyle='#1d2625';ctx.fillRect(0,0,384,704);
 // Reuse approved floor and walls as tile textures, rendered on the low-resolution world grid.
 ctx.save();ctx.beginPath();ctx.rect(24,144,336,514);ctx.clip();
 for(let y=144;y<658;y+=48)for(let x=24;x<360;x+=96)ctx.drawImage(images.room,120,540,720,360,x,y,96,48);
 ctx.restore();
 ctx.drawImage(images.room,92,126,1063,383,24,74,336,79);
 ctx.drawImage(images.room,35,510,57,599,17,153,7,505);
 ctx.drawImage(images.room,1156,510,57,599,360,153,7,505);
 ctx.drawImage(images.room,37,1104,1176,108,17,658,350,17);
 ctx.fillStyle='#13201b';ctx.globalAlpha=.26;ctx.fillRect(0,0,384,704);ctx.globalAlpha=1;
 prop('tv',215,97,30,20);
}
function walkingPlayer(){
 const image=player.moving?images.player_walk:images.player_idle,index=Math.floor(clock/(player.moving?.12:.3))%4;
 ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y));if(player.face===-1)ctx.scale(-1,1);
 ctx.drawImage(image,index*32,0,32,32,-20,-34,40,40);ctx.restore();
}
function render(){
 updateCamera();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;room();
 if(marker){ctx.save();ctx.globalAlpha=.7;ctx.strokeStyle='#c0c493';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(marker.x,marker.y,5,2,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 const idle=Math.floor(clock/.8)%2;
 let frame=5;if(player.mode==='seated')frame=Math.floor(player.time/.8)%2;else if(player.mode==='rising')frame=[2,3,4,5][Math.min(3,Math.floor(player.time/.18))];else if(player.mode==='sitting')frame=[4,3,2,0][Math.min(3,Math.floor(player.time/.18))];
 const layers=[
 {y:287,draw:()=>prop('chair_front',185,273,14,23)},
 {y:293,draw:()=>actor('officer_1',192,293,26,idle)},
 {y:326,draw:()=>prop('chair_side',141,311,16,26)},
 {y:326,draw:()=>prop('chair_side',228,311,16,26,true)},
 {y:331,draw:()=>actor('officer_2',151,331,27,Math.floor((clock+.3)/.8)%2)},
 {y:338,draw:()=>{prop('table',164,292,56,46);prop('teapot',186,310,10,8);prop('cup',189,297,5,4);prop('cup',169,314,5,4);prop('cup',209,314,5,4);}},
 {y:player.y,draw:()=>{if(['standing','leaving','returning'].includes(player.mode))walkingPlayer();else actor('officer_3',player.x,player.y,26,frame);}}
 ];
 // The side seats are beside the tabletop; draw their occupants after it.
 if(player.mode==='seated'||player.mode==='rising'||player.mode==='sitting')layers[layers.length-1].y=339;
 layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());
 ctx.save();ctx.strokeStyle='#a5ae77';ctx.lineWidth=1;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(player.x,player.y+3,12,4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 const z=camera.dpr*camera.scale;screen.setTransform(z,0,0,z,-camera.x*z,-camera.y*z);screen.imageSmoothingEnabled=false;screen.drawImage(world,0,0);
 if(flash){screen.setTransform(1,0,0,1,0,0);screen.strokeStyle='#a5ae77';screen.lineWidth=2;screen.strokeRect(1,1,canvas.width-2,canvas.height-2);}
}
function loop(now){const dt=last?Math.min((now-last)/1000,.04):0;last=now;if(ready){if(!paused)update(dt);render();}requestAnimationFrame(loop);}
async function load(){try{await Promise.all(Object.entries(M).map(([name,a])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(new Error(a.file));im.src=a.file;})));ready=true;document.getElementById('loading').hidden=true;updateUI();requestAnimationFrame(loop);}catch(e){document.getElementById('load-status').textContent='Не удалось загрузить графику. Проверьте соединение и попробуйте ещё раз.';document.getElementById('retry').hidden=false;}}
document.getElementById('retry').onclick=()=>location.reload();
// Read-only state for browser QA, no gameplay mutations exposed.
window.station={snapshot:()=>({ready,paused,player:{x:player.x,y:player.y,mode:player.mode,pathLength:player.path.length},camera:{...camera},isFree:isFree(player.x,player.y)}),isFree};
load();
