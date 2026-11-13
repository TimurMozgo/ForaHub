"use client";
import {useRef,useState} from 'react';
import type {OpeningPrize} from './case-opening-prizes';
export function GiftActions({prize,openingId,onBusy,onSold}:{prize:OpeningPrize;openingId?:string;onBusy?:(busy:boolean)=>void;onSold?:()=>void}){
 const [busy,setBusy]=useState(false),[sold,setSold]=useState(false),[message,setMessage]=useState('');const lock=useRef(false),pending=useRef<string|null>(null);
 async function sell(){
  if(lock.current||sold)return;lock.current=true;setBusy(true);onBusy?.(true);setMessage('');
  const storageKey='hub-sale-pending:'+(openingId??prize.id);
  try{
   try{pending.current=localStorage.getItem(storageKey)||pending.current||crypto.randomUUID();localStorage.setItem(storageKey,pending.current);}catch{pending.current??=crypto.randomUUID();}
   const r=await fetch('/api/cases/sell',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.current,prizeId:prize.id,openingId})});const data=await r.json() as {error?:string;sale?:{amount:number}};
   if(!r.ok){if(['gift_unavailable','already_sold','request_conflict'].includes(data.error??'')){try{localStorage.removeItem(storageKey);}catch{}pending.current=null;window.dispatchEvent(new Event('hub-account-updated'));if(data.error==='already_sold')setSold(true);}throw Error(data.error==='already_sold'?'Этот подарок уже продан.':data.error==='gift_unavailable'?'Подарок уже недоступен.':'Не удалось продать. Нажми ещё раз, чтобы повторить.');}
   try{localStorage.removeItem(storageKey);}catch{}pending.current=null;setSold(true);onSold?.();setMessage(`Зачислено ${data.sale!.amount.toLocaleString('ru-RU')} Stars`);window.dispatchEvent(new Event('hub-account-updated'));
  }catch(e){setMessage(e instanceof Error?e.message:'Не удалось продать подарок.');}finally{lock.current=false;setBusy(false);onBusy?.(false);}
 }
 return <div className="gift-actions"><button className="gift-sell" disabled={busy||sold} onClick={sell}>{busy?'Продаём…':sold?'Продано':`Продать за ${prize.costStars.toLocaleString('ru-RU')} Stars`}</button><button className="gift-withdraw" disabled title="Вывод будет доступен после подключения Telegram-бота">Вывести · недоступно</button>{message&&<p role="status">{message}</p>}</div>;
}
