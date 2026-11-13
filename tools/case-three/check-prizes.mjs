import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../../components/case-opening-prizes.ts',import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm'});
const {CASE_CONFIG,TOTAL_WEIGHT,getOpeningPrizes,prizeForTicket,pickOpeningPrize,getCaseEconomics,validatePrizeTable,formatPrizeChance,dailyAvailableAt}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
assert.deepEqual(CASE_CONFIG.map(c=>c.price),[0,10,25,50,100]);
for(let index=0;index<5;index++){
 const pool=getOpeningPrizes(index);assert.equal(pool.filter(p=>p.kind==='gem').length,5);assert.equal(pool.filter(p=>p.kind==='gift').length,4);assert(pool.some(p=>p.kind==='star'));
 let cursor=0;for(const p of pool){assert(p.weight>0);assert.equal(prizeForTicket(index,cursor).id,p.id);assert.equal(prizeForTicket(index,cursor+p.weight-1).id,p.id);assert.equal(pickOpeningPrize(index,()=>(cursor+.5)/TOTAL_WEIGHT).id,p.id);cursor+=p.weight;if(p.image)assert(fs.existsSync(new URL('../../public'+p.image,import.meta.url)));assert.notEqual(formatPrizeChance(p.weight),'0%');}
 assert.equal(cursor,TOTAL_WEIGHT);assert.equal(pool[0].id,'redo');
 const e=getCaseEconomics(index);if(index){assert(e.expectedCost<=e.price*.28+1e-8);assert(e.expectedCost>e.price*.2799);assert(e.expectedCost+e.loyaltyProvision<=e.price*.5);}else assert(e.expectedCost<=1.2+1e-8);
 assert.throws(()=>validatePrizeTable(index,pool.map(p=>({...p,costStars:1000000000}))));
 console.log(CASE_CONFIG[index].id,JSON.stringify(e),'Redo',formatPrizeChance(pool[0].weight));
}
assert.throws(()=>prizeForTicket(1,-1));assert.throws(()=>prizeForTicket(1,TOTAL_WEIGHT));assert.throws(()=>pickOpeningPrize(1,()=>1));assert.equal(dailyAvailableAt(100),86400100);
console.log('PASS: all prize intervals including rarest NFT, every category, visible nonzero chances, assets, expected-cost caps and loyalty provision.');


const seen=new Set();for(let i=0;i<5;i++)for(const p of getOpeningPrizes(i).filter(p=>p.kind==='gem'&&p.id!=='redo')){assert(!seen.has(p.id),'Duplicate NFT '+p.id);seen.add(p.id);}console.log('PASS: disjoint NFT collections except Redo');
