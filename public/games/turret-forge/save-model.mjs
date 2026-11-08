/** Only gameplay progress is accepted; no identities, purchases or Stars. */
export function validateState(value) {
  if (!value || typeof value !== 'object') return null;
  const {coins,hp,wave,best,slots,sound}=value;
  if (!Number.isFinite(coins)||coins<0||coins>1e15 || !Number.isFinite(hp)||hp<0||hp>100 ||
      !Number.isInteger(wave)||wave<1||wave>10000 || !Number.isInteger(best)||best<wave||best>10000 ||
      !Array.isArray(slots)||slots.length!==12||!slots.every(n=>Number.isInteger(n)&&n>=0&&n<=20) || typeof sound!=='boolean') return null;
  return {coins,hp,wave,best,slots:[...slots],sound};
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
