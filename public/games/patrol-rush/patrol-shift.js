'use strict';
window.patrolShift=(()=>{
 const testRobbery=new URLSearchParams(window.location?.search||'').get('test')==='night-robbery';
 const key='patrol-rush-shifts-v1';let s={mode:'night',completed:0,queue:[],rewarded:[]};
 try{const x=JSON.parse(localStorage.getItem(key));if(x&&['day','night'].includes(x.mode))s={...s,...x,queue:Array.isArray(x.queue)?x.queue:[],rewarded:Array.isArray(x.rewarded)?x.rewarded:[]};}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(s));}catch{}};
 function change(){s.queues=s.queues||{};s.queues[s.mode]=s.queue;s.mode=s.mode==='night'?'day':'night';s.queue=s.queues[s.mode]||[];s.completed=0;}
 const halfDay=12*60*1000;
 if(!Number.isFinite(s.cycleStartedAt)){s.cycleStartedAt=Date.now()-(s.mode==='day'?halfDay:0);save();}
 function sync(){const elapsed=Math.max(0,Date.now()-s.cycleStartedAt),mode=Math.floor(elapsed/halfDay)%2===0?'night':'day';if(mode!==s.mode){change();save();}return elapsed;}
 function clock(){const minutes=Math.floor(sync()/1000)+18*60;return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
 const eligible=i=>s.mode==='night'?[11,12,13,0,1,2,9].includes(i):i<11;
 function next(catalog){if(testRobbery)return 11;sync();s.queue=s.queue.filter(i=>Number.isInteger(i)&&catalog[i]&&eligible(i));if(!s.queue.length){s.queue=(s.mode==='night'?[11,12,13,0,1,2,9]:[0,1,2,3,4,5,6,7,8,9,10]);s.rounds=s.rounds||{};if(s.rounds[s.mode])for(let j=s.queue.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[s.queue[j],s.queue[k]]=[s.queue[k],s.queue[j]];}s.rounds[s.mode]=(s.rounds[s.mode]||0)+1;}if(s.queue.length>1&&s.queue[0]===s.lastDispatch){const other=s.queue.findIndex(i=>i!==s.lastDispatch);[s.queue[0],s.queue[other]]=[s.queue[other],s.queue[0]];}const i=s.queue.shift();s.lastDispatch=i;save();return i;}
 function complete(id){if(s.rewarded.includes(id))return;s.rewarded.push(id);s.rewarded=s.rewarded.slice(-50);s.completed++;sync();save();}

 function light(g,car,actors,time,w=384,h=1024){sync();if(!testRobbery&&s.mode!=='night')return;g.save();g.fillStyle='#07132d';g.globalAlpha=.46;g.fillRect(0,0,w,h);g.globalCompositeOperation='screen';
  for(const [x,y] of [[155,210],[155,520],[155,810],[370,350],[370,700]]){const glow=g.createRadialGradient(x,y,2,x,y,80);glow.addColorStop(0,'#b28b4460');glow.addColorStop(1,'#b28b4400');g.globalAlpha=1;g.fillStyle=glow;g.fillRect(x-80,y-80,160,160);g.fillStyle='#ffdf95';g.fillRect(x-2,y-2,4,4);}
  if(car){g.translate(car.x,car.y);g.rotate(car.angle||0);g.fillStyle='#e9edb31c';g.beginPath();g.moveTo(-22,-38);g.lineTo(-58,-180);g.lineTo(58,-180);g.lineTo(22,-38);g.closePath();g.fill();g.rotate(-(car.angle||0));g.translate(-car.x,-car.y);}
  for(const a of actors.filter(a=>a.visible)){const glow=g.createRadialGradient(a.x,a.y,8,a.x,a.y,65);glow.addColorStop(0,'#9dbeab20');glow.addColorStop(1,'#9dbeab00');g.fillStyle=glow;g.fillRect(a.x-65,a.y-65,130,130);}g.restore();
 }
 return{next,complete,light,clock,isNight:()=>{sync();return testRobbery||s.mode==='night';},label:()=>{if(testRobbery)return 'НОЧЬ · ПРОВЕРКА ОГРАБЛЕНИЯ';sync();return (s.mode==='night'?'НОЧЬ':'ДЕНЬ')+' · '+clock();},snapshot:()=>{sync();return {...s,queue:[...s.queue],clock:clock(),cycleMinutes:24};}};
})();
