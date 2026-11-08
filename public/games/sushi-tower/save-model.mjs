export function validateState(v){
 if(!v||typeof v!=='object'||v.version!==4||!v.restaurants||typeof v.restaurants!=='object')return null;
 const num=(n,max=1e15)=>Number.isFinite(n)&&n>=0&&n<=max;
 if(!num(v.coins)||!num(v.gems)||typeof v.sound!=='boolean'||!num(v.volume,1)||![8,12].includes(v.storageHours)||!num(v.lastAt,8e15)||!num(v.rushWindow,8e15)||!num(v.rushReadyAt,8e15)||!num(v.rushRewards,3))return null;
 const restaurants={};
 for(const id of ['park','harbor','sunset']){
  const s=v.restaurants[id];if(!s)continue;
  if(!Number.isInteger(s.floors)||s.floors<1||s.floors>5||!['kitchen','lift','cash'].every(k=>Number.isInteger(s[k])&&s[k]>=1&&s[k]<=1e6)||!['served','best','pending','rep','repWindow','repEarned','taskWindow','taskOrders','taskRush'].every(k=>num(s[k]))||s.repEarned>180||!Array.isArray(s.claimed)||s.claimed.length>3||!s.claimed.every(k=>['orders30','orders80','rush1'].includes(k))||typeof s.skin!=='boolean'||typeof s.skinOwned!=='boolean'||s.skin&&!s.skinOwned)return null;
  restaurants[id]=Object.fromEntries(['floors','kitchen','lift','cash','served','best','pending','rep','repWindow','repEarned','taskWindow','taskOrders','taskRush','skinOwned','skin'].map(k=>[k,s[k]]));restaurants[id].claimed=[...new Set(s.claimed)];
 }
 if(!restaurants.park||!['park','harbor','sunset'].includes(v.active)||!restaurants[v.active])return null;
 return {version:4,coins:v.coins,gems:v.gems,sound:v.sound,volume:v.volume,active:v.active,restaurants,lastAt:v.lastAt,storageHours:v.storageHours,rushWindow:v.rushWindow,rushRewards:v.rushRewards,rushReadyAt:v.rushReadyAt,migrated:v.migrated===true};
}
export function validateLocal(value) {
  if (!value || value.version!==2 || !validateState(value.state) || !Number.isInteger(value.baseRevision) || value.baseRevision<0 ||
      typeof value.dirty!=='boolean' || typeof value.mutationId!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(value.mutationId)) return null;
  return {...value,state:validateState(value.state)};
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
