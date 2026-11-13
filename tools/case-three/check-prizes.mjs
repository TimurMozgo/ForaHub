import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../../components/case-opening-prizes.ts',import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm'});
const {CASE_CONFIG,getOpeningPrizes,pickOpeningPrize,getCaseEconomics,dailyAvailableAt}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
assert.deepEqual(CASE_CONFIG.map(c=>c.price),[0,10,25,50,100]);assert.deepEqual(CASE_CONFIG.map(c=>c.palette),[0,0,1,2,2]);
for(let index=0;index<5;index++){
 const pool=getOpeningPrizes(index);assert(!pool.some(p=>p.kind==='gem'));assert.equal(pool.reduce((n,p)=>n+p.weight,0),10000);
 const counts=new Map();for(let ticket=0;ticket<10000;ticket++){const p=pickOpeningPrize(index,()=>(ticket+.5)/10000);counts.set(p.id,(counts.get(p.id)||0)+1);if(index>0)assert(p.costStars<=CASE_CONFIG[index].price/2);}
 for(const p of pool){assert.equal(counts.get(p.id),p.weight);if(p.image)assert(fs.existsSync(new URL('../../public'+p.image,import.meta.url)));}
 const e=getCaseEconomics(index);if(index>0)assert(e.expectedCost/e.price>=.25&&e.expectedCost/e.price<=.28);console.log(CASE_CONFIG[index].id,JSON.stringify(e));
}
assert.equal(dailyAvailableAt(100),86400100);assert.throws(()=>getOpeningPrizes(9));assert.throws(()=>pickOpeningPrize(1,()=>1));console.log('PASS: all weighted outcomes, caps, costs, assets, disabled NFTs and daily duration.');
