export function validateState(v){
 if(!v||v.version!==3||!Number.isInteger(v.stage)||v.stage<0||v.stage>4||!Number.isInteger(v.coins)||v.coins<0||v.coins>1000000||!Number.isFinite(v.score)||v.score<0||v.score>1e12||typeof v.complete!=="boolean"||!Array.isArray(v.units)||v.units.length!==6)return null;
 if(!v.units.every(u=>u===null||(u&&Number.isInteger(u.type)&&u.type>=1&&u.type<=15&&Math.floor((u.type-1)/3)+1<=v.stage+1)))return null;
 return {version:3,stage:v.stage,coins:v.coins,score:v.score,units:v.units.map(u=>u?{type:u.type}:null),complete:v.complete};
}
export function validateLocal(v){if(!v||v.version!==2||!validateState(v.state)||!Number.isInteger(v.baseRevision)||v.baseRevision<0||typeof v.dirty!=="boolean"||typeof v.mutationId!=="string"||!/^[a-zA-Z0-9-]{16,80}$/.test(v.mutationId))return null;return {...v,state:validateState(v.state)};}
export function reconcile(local,remote){if(!local)return 'remote';if(!local.dirty)return 'remote';if(remote&&remote.mutationId===local.mutationId)return 'acknowledged';if(remote&&remote.mutationId===local.lastAttemptId)return 'rebase';if(local.baseRevision===(remote?.revision||0))return 'local';return 'conflict';}
