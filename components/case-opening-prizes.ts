import {GIFTS,type Prize} from './case-prizes';
import {getCaseNFTCollection} from './case-nft-collections';
export const CASE_CONFIG=[
 {id:'daily',name:'Ежедневный',price:0,tone:'silver',art:'spark',palette:3},
 {id:'starter',name:'Искра',price:10,tone:'blue',art:'spark',palette:0},
 {id:'pulse',name:'Импульс',price:25,tone:'violet',art:'pulse',palette:1},
 {id:'glow',name:'Сияние',price:50,tone:'emerald',art:'spark',palette:4},
 {id:'legend',name:'Легенда',price:100,tone:'gold',art:'legend',palette:2},
] as const;

export type OpeningPrize=Prize&{id:string;weight:number;costStars:number};
export const TOTAL_WEIGHT=100_000_000;
export const DAILY_EXPECTED_BUDGET=1.2;
export const PAID_RANDOM_RETURN=.28;
export const LOYALTY_BUDGET_RATE=.2;
// Planning assumptions in Stars, NOT verified purchase quotes. No real issuance yet.
// Redo = user's quoted 46,000; other NFT values must be replaced by landed stock costs.
export const PRIZE_COSTS:Record<string,number>={heart:15,bear:15,box:25,rose:25,cake:50,flowers:50,rocket:50,champagne:50,trophy:100,ring:100,diamond:100,lollipop:500,candy:510,jester:570,sparkler:630,candle:640,homemade:660,cookie:670,calendar:750,redo:46000};
const GIFT_IDS=[['heart','bear','box','rose'],['heart','bear','box','champagne'],['bear','rose','flowers','rocket'],['heart','box','cake','flowers'],['cake','rocket','ring','trophy']];
const star=(amount:number,weight:number):OpeningPrize=>({id:'stars-'+amount,kind:'star',amount,label:amount+' '+(amount===1?'звезда':amount===2?'звезды':'звёзд'),weight,costStars:amount});
const expected=(table:readonly OpeningPrize[])=>table.reduce((n,p)=>n+p.costStars*p.weight/TOTAL_WEIGHT,0);
function buildTable(index:number):OpeningPrize[]{
 const config=CASE_CONFIG[index],price=config.price;
 const nft=getCaseNFTCollection(config.id);
 const list:OpeningPrize[]=[];
 // Allocate expected COST, not a flat probability: a more costly item is rarer.
 const append=(id:string,budget:number)=>{const costStars=PRIZE_COSTS[id];if(!costStars)throw Error('Missing cost');const weight=Math.floor(budget*TOTAL_WEIGHT/costStars);if(weight<1)throw Error('Prize budget too small');list.push({...GIFTS[id],id,costStars,weight});};
 const ordinaryNFT=nft.filter(p=>p.id!=='redo');
 append('redo',price?price*.005:.001);
 for(const p of ordinaryNFT)append(p.id!, (price?price*.04:.01)/ordinaryNFT.length);
 for(const id of GIFT_IDS[index])append(id,(price?price*.08:.02)/GIFT_IDS[index].length);
 const remaining=TOTAL_WEIGHT-list.reduce((n,p)=>n+p.weight,0);
 const target=price?price*PAID_RANDOM_RETURN:DAILY_EXPECTED_BUDGET;
 const high=[2,5,10,25,50][index];
 const extra=target-expected(list)-remaining/TOTAL_WEIGHT;
 const highWeight=Math.floor(extra*TOTAL_WEIGHT/(high-1));
 if(highWeight<=0||highWeight>=remaining)throw Error('Invalid star allocation');
 list.push(star(1,remaining-highWeight),star(high,highWeight));return list;
}
const TABLES=CASE_CONFIG.map((_,i)=>buildTable(i));
export function validatePrizeTable(index:number,table:readonly OpeningPrize[]){
 const config=CASE_CONFIG[index];if(!config||!table.length)throw Error('Unknown case');
 if(table.reduce((n,p)=>n+p.weight,0)!==TOTAL_WEIGHT)throw Error('Invalid probability total');
 const ids=new Set<string>();for(const p of table){if(ids.has(p.id)||!Number.isSafeInteger(p.weight)||p.weight<=0||!Number.isSafeInteger(p.costStars)||p.costStars<=0)throw Error('Invalid prize');ids.add(p.id);}
 for(const kind of ['star','gift','gem'])if(!table.some(p=>p.kind===kind))throw Error('Missing prize category');
 const cost=expected(table);
 if(config.price>0){if(cost>config.price*.5+1e-8)throw Error('Average prize cost exceeds 50%');if(cost+config.price*LOYALTY_BUDGET_RATE>config.price*.5+1e-8)throw Error('Rewards plus loyalty exceed 50%');}
 else if(cost>DAILY_EXPECTED_BUDGET+1e-8)throw Error('Daily budget exceeded');
}
export function getOpeningPrizes(index:number):readonly OpeningPrize[]{const table=TABLES[index];if(!table)throw Error('Unknown case');validatePrizeTable(index,table);return table;}
export function getCaseEconomics(index:number){const table=getOpeningPrizes(index),price=CASE_CONFIG[index].price;return {price,maxCost:Math.max(...table.map(p=>p.costStars)),expectedCost:expected(table),loyaltyProvision:price*LOYALTY_BUDGET_RATE};}
export const prizeChance=(weight:number)=>weight*100/TOTAL_WEIGHT;
export const formatPrizeChance=(weight:number)=>prizeChance(weight).toLocaleString('ru-RU',{maximumFractionDigits:6})+'%';
// Rejection sampling avoids modulo bias even for the smallest rare-prize interval.
export function secureTicket(){const limit=Math.floor(4294967296/TOTAL_WEIGHT)*TOTAL_WEIGHT;let n:number;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=limit);return n%TOTAL_WEIGHT;}
export function prizeForTicket(index:number,ticket:number):OpeningPrize{if(!Number.isInteger(ticket)||ticket<0||ticket>=TOTAL_WEIGHT)throw Error('Invalid ticket');for(const p of getOpeningPrizes(index)){ticket-=p.weight;if(ticket<0)return p;}throw Error('Invalid distribution');}
// Visual result only: real payment debits and transferable assets are not connected.
export function pickOpeningPrize(index:number,random?:()=>number):OpeningPrize{if(!random)return prizeForTicket(index,secureTicket());const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random value');return prizeForTicket(index,Math.floor(n*TOTAL_WEIGHT));}
export const DAILY_INTERVAL_MS=24*60*60*1000;
export function dailyAvailableAt(openedAt:number){return openedAt+DAILY_INTERVAL_MS;}
