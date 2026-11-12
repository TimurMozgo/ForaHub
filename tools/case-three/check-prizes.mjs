import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../../components/case-opening-prizes.ts',import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm'});
const {getOpeningPrizes,pickOpeningPrize}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
for(let index=0;index<3;index++){
 const pool=getOpeningPrizes(index);assert(pool.some(p=>p.kind==='gift'));assert(pool.some(p=>p.kind==='gem'));assert(pool.some(p=>p.kind==='star'));
 pool.forEach((p,i)=>{assert.deepEqual(pickOpeningPrize(index,()=>(i+.5)/pool.length),p);if(p.image)assert(fs.existsSync(new URL('../../public'+p.image,import.meta.url)));});
}
assert(!getOpeningPrizes(0).some(p=>p.id==='cookie'));assert(getOpeningPrizes(2).some(p=>p.id==='cookie'));
assert.throws(()=>getOpeningPrizes(9));console.log('PASS: every result belongs to the selected collection; gift files exist; all outcome types reachable.');
