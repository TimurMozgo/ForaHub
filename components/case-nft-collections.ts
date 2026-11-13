import {GIFTS} from './case-prizes';

// Display-only floor snapshot, 2026-11-13, approximate TON values.
// https://telegifter.ru/gifts/collections/
// These are collection floors, NOT a procurement quote or funded drop inventory.
export const NFT_DISPLAY_FLOORS:Record<string,number>={
 lollipop:3.95,candy:3.98,jester:4.5,sparkler:4.94,
 candle:5,homemade:5.18,cookie:5.21,calendar:5.91,redo:529.36,
 bowtie:5.65, evileye:8.49, lightsword:6.48, jellybunny:8.34, crystalball:14, lovepotion:14.87, madpumpkin:12.46, flyingbroom:13.57, bondedring:44.5, genielamp:37.89, kissedfrog:50.49, magicpotion:63.7,
};
const collections:Record<string,string[]>={
 daily:['redo','sparkler','jester','candy','lollipop'],
 starter:['redo','candle','homemade','cookie','calendar'],
 pulse:['redo','bowtie','lightsword','jellybunny','evileye'],
 glow:['redo','madpumpkin','flyingbroom','crystalball','lovepotion'],
 legend:['redo','genielamp','bondedring','kissedfrog','magicpotion'],
};
export function getCaseNFTCollection(id:string){
 const ids=collections[id];if(!ids)throw new Error('Unknown NFT collection');
 return [...ids].sort((a,b)=>NFT_DISPLAY_FLOORS[b]-NFT_DISPLAY_FLOORS[a]).map(id=>GIFTS[id]);
}
