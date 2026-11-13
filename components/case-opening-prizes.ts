import {GIFTS,type Prize} from './case-prizes';
export const CASE_CONFIG=[
 {id:'daily',name:'Ежедневный',price:0,tone:'silver',art:'spark',palette:3},
 {id:'starter',name:'Искра',price:10,tone:'blue',art:'spark',palette:0},
 {id:'pulse',name:'Импульс',price:25,tone:'violet',art:'pulse',palette:1},
 {id:'glow',name:'Сияние',price:50,tone:'emerald',art:'spark',palette:4},
 {id:'legend',name:'Легенда',price:100,tone:'gold',art:'legend',palette:2},
] as const;
export type OpeningPrize=Prize&{id:string;weight:number;costStars:number};
const star=(amount:number,weight:number):OpeningPrize=>({id:`stars-${amount}`,kind:'star',amount,label:`${amount} ${amount===1?'звезда':amount===2?'звезды':'звёзд'}`,weight,costStars:amount});
// Cost assumptions supplied for the ordinary gifts. Re-verify procurement before payments go live.
const COST:Record<string,number>={heart:15,bear:15,box:25,rose:25,cake:50,flowers:50,rocket:50,champagne:50};
const gift=(id:string,weight:number):OpeningPrize=>({...GIFTS[id],id,weight,costStars:COST[id]});
const TABLES:OpeningPrize[][]=[
 [star(1,9000),star(2,1000)],
 [star(1,3500),star(2,3500),star(5,3000)],
 [star(1,1500),star(2,1500),star(5,2000),star(10,5000)],
 [star(1,1000),star(2,1500),star(10,1500),star(15,1000),gift('heart',1500),gift('bear',1500),gift('box',1000),gift('rose',1000)],
 [star(1,1500),star(2,1500),star(25,2000),star(50,1500),gift('bear',500),gift('box',500),gift('cake',1250),gift('rocket',1250)],
];
export function getOpeningPrizes(index:number):OpeningPrize[]{
 const config=CASE_CONFIG[index],table=TABLES[index];if(!config||!table)throw new Error('Unknown case');
 if(table.reduce((sum,p)=>sum+p.weight,0)!==10000)throw new Error('Invalid probability total');
 for(const p of table){if(!Number.isInteger(p.weight)||p.weight<=0||!Number.isFinite(p.costStars)||p.costStars<=0)throw new Error('Invalid prize');if(config.price>0&&p.costStars>config.price*.5)throw new Error('Prize exceeds cost cap');}
 return table;
}
export function getCaseEconomics(index:number){const table=getOpeningPrizes(index),price=CASE_CONFIG[index].price;return{price,maxCost:Math.max(...table.map(p=>p.costStars)),expectedCost:table.reduce((sum,p)=>sum+p.costStars*p.weight/10000,0)};}
// No balance debit or real asset issuance. Paid openings use the visual odds only until settlement exists.
export function pickOpeningPrize(index:number,random=Math.random):OpeningPrize{
 const pool=getOpeningPrizes(index),value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Invalid random value');
 let threshold=value*10000;for(const prize of pool){threshold-=prize.weight;if(threshold<0)return prize;}throw new Error('Invalid distribution');
}
export const DAILY_INTERVAL_MS=24*60*60*1000;
export function dailyAvailableAt(openedAt:number){return openedAt+DAILY_INTERVAL_MS;}
