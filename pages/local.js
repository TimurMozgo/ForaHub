// Temporary, device-only transport for the Pages preview. No payment or cloud writes.
(()=>{
 const original=window.fetch.bind(window),base='/ForaHub/';
 const json=(data,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
 let account='guest';try{account=String((window.parent.Telegram||window.Telegram)?.WebApp?.initDataUnsafe?.user?.id||'guest');}catch{}
 const scope='pages-local-'+account;
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),path=url.pathname.replace(/^\/ForaHub/,'');
  if(url.origin!==location.origin||!path.startsWith('/api/'))return original(input,options);
  const version=path.match(/^\/api\/([^/]+)\/version$/);
  if(version)return original(base+'games/'+version[1]+'/version.json',options);
  const save=path.match(/^\/api\/(turret-forge|dead-route|cats-defender|sushi-tower)\/save$/);
  if(save){
   const key='forahub:pages:checkpoint:'+scope+':'+save[1],formatVersion=save[1]==='dead-route'?3:2;
   try{
    let record=JSON.parse(localStorage.getItem(key)||'null');
    if((options.method||'GET')==='PUT'){
     const body=JSON.parse(options.body);
     if(record?.mutationId!==body.mutationId){
      if((record?.revision||0)!==body.baseRevision)return json({error:'conflict',scope,record},409);
      record={state:body.state,revision:(record?.revision||0)+1,mutationId:body.mutationId,updatedAt:new Date().toISOString()};
      localStorage.setItem(key,JSON.stringify(record));
     }
    }
    return json({scope,record,formatVersion,identity:'local'});
   }catch{return json({scope,error:'local_storage_unavailable'},503);}
  }
  if(path==='/api/cases/account')return json({balance:0,nextAt:0,revision:0,serverNow:Date.now(),inventory:[],credits:[],sales:[],history:[]});
  if(path==='/api/quests'){
   const rewards={daily:100,first:150,favorite:50,'weekly:cats':80,'weekly:dead':80,'weekly:sushi':80,'weekly:turret':80,'weekly:favorite':80,'weekly:store':80,'weekly:bonus':200};
   return json({xp:0,week:'',day:'',resetAt:'',active:[],completed:0,quests:Object.fromEntries(Object.entries(rewards).map(([id,reward])=>[id,{ready:false,claimed:false,reward}]))});
  }
  return json({error:'not_configured'},503);
 };
 window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();
})();
