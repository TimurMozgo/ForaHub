export const zones=['c1-1','c1-2','c1-3','c1-4','c1-5','post','service','tunnel','depot','ending','breakdown','station'];
export function validateState(v){
 if(!v||typeof v!=='object'||!zones.includes(v.zone)||typeof v.started!=='boolean'||typeof v.completed!=='boolean'||!Array.isArray(v.crew)||v.crew.length<1||v.crew.length>20)return null;
 const num=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
 if(!v.crew.every(a=>a&&typeof a.name==='string'&&a.name.length>0&&a.name.length<40&&Number.isInteger(a.type)&&a.type>=1&&a.type<=5&&num(a.hp,100)&&a.hp>0))return null;
 const k=v.kit;if(!k||!['pistol','shotgun'].includes(k.weapon)||typeof k.hasShotgun!=='boolean'||!num(k.money,1e9)||!num(k.damage,1e5)||!num(k.ammo,1000)||!num(k.reserve,1e6)||!num(k.grenades,1e4)||!k.bank||!['pistol','shotgun'].every(w=>k.bank[w]&&num(k.bank[w].ammo,1000)&&num(k.bank[w].reserve,1e6)))return null;
 const chapter=chapterOf(v.zone);
 if(v.phase!==undefined&&!['entry','shop'].includes(v.phase))return null;
 if(v.phase==='shop'&&chapter!==1)return null;
 if(v.completedChapters!==undefined&&(!Array.isArray(v.completedChapters)||!v.completedChapters.every(n=>Number.isInteger(n)&&n>=1&&n<=3)))return null;
 const completedChapters=v.completedChapters===undefined?Array.from({length:chapter-1},(_,i)=>i+1):[...new Set(v.completedChapters)].sort();
 return {zone:v.zone,started:v.started,completed:v.completed,phase:v.phase||'entry',completedChapters,legacy:v.legacy===true,crew:v.crew.map(({name,type,hp})=>({name,type,hp})),kit:{weapon:k.weapon,hasShotgun:k.hasShotgun,money:k.money,damage:k.damage,ammo:k.ammo,reserve:k.reserve,grenades:k.grenades,bank:{pistol:{ammo:k.bank.pistol.ammo,reserve:k.bank.pistol.reserve},shotgun:{ammo:k.bank.shotgun.ammo,reserve:k.bank.shotgun.reserve}}}};
}
export function validateLocal(value) {
  if (!value || ![2,3].includes(value.version) || !validateState(value.state) || !Number.isInteger(value.baseRevision) || value.baseRevision<0 ||
      typeof value.dirty!=='boolean' || typeof value.mutationId!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(value.mutationId)) return null;
  return {...value,version:3,state:migrateState(value.state)};
}
/** Timestamps never decide conflicts: only server revisions and operation receipts do. */
export function reconcile(local,remote) {
  if (!local) return 'remote';
  if (!local.dirty) return 'remote';
  if (remote && remote.mutationId===local.mutationId) return 'acknowledged';
  if (remote && remote.mutationId===local.lastAttemptId) return 'rebase';
  if (remote && remote.mutationId===local.lastAttemptId) return 'rebase';
  if (local.baseRevision===(remote?.revision||0)) return 'local';
  return 'conflict';
}

export function chapterOf(zone){return zone.startsWith('c1-')?1:['breakdown','station'].includes(zone)?3:2;}
export function freshCampaign(){return {zone:'c1-1',started:false,completed:false,phase:'entry',completedChapters:[],legacy:false,crew:[{name:'ВАНЯ (Я)',type:1,hp:100}],kit:{weapon:'pistol',hasShotgun:false,money:0,damage:18,ammo:12,reserve:72,grenades:3,bank:{pistol:{ammo:12,reserve:72},shotgun:{ammo:6,reserve:18}}}};}
export function migrateState(raw){
 const v=validateState(raw);if(!v)return null;
 if(raw.completedChapters!==undefined)return v;
 if(!v.started)return freshCampaign();
 v.legacy=true;
 if(v.completed&&v.zone==='ending')return {...v,zone:'breakdown',completed:false,completedChapters:[1,2]};
 if(v.completed&&v.zone==='breakdown')return {...v,zone:'station',completed:false,completedChapters:[1,2]};
 if(v.completed&&v.zone==='station')v.completedChapters=[1,2,3];
 return v;
}
