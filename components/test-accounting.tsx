'use client';
import {useEffect,useState} from 'react';
import type {TestOperation} from '../lib/accounting-test';
type Gift={opening:string;label:string;sale:number};
type Snapshot={balance:number;gifts:Gift[]};
const key='forahub-sheet-test-pending-v1';
const messages:Record<string,string>={not_configured:'Подключение Google Таблицы ещё не настроено.',insufficient_balance:'Недостаточно тестовых средств.',already_sold:'Этот подарок уже продан.',gift_not_owned:'Подарок не найден.',invalid_balance:'Баланс не может стать отрицательным.',request_conflict:'Этот номер операции уже используется.',owner_only:'Доступно только владельцу.',sync_uncertain:'Ответ таблицы не получен. Повтори ту же операцию — повторного начисления не будет.'};
export default function TestAccounting(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[amount,setAmount]=useState('100'),[adjust,setAdjust]=useState('20'),[price,setPrice]=useState('50'),[prize,setPrize]=useState('box'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[pending,setPending]=useState<TestOperation|null>(null);
 async function call(operation:unknown){const r=await fetch('/api/accounting-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(operation)});const b=await r.json() as {ok:boolean;error?:string;result:Snapshot&{duplicate?:boolean}};if(!r.ok||!b.ok)throw Error(b.error||'sync_uncertain');return b.result;}
 async function refresh(){const s=await call({action:'state'});setSnapshot(s);}
 useEffect(()=>{try{const saved=sessionStorage.getItem(key);if(saved)setPending(JSON.parse(saved));}catch{}refresh().catch(e=>setNotice(messages[e.message]||'Не удалось прочитать таблицу.'));},[]);
 async function send(o:TestOperation){
  setBusy(true);setNotice('Записываю в Google Таблицу…');setPending(o);sessionStorage.setItem(key,JSON.stringify(o));
  try{const r=await call(o);sessionStorage.removeItem(key);setPending(null);setNotice(r.duplicate?'Операция уже записана. Повторного начисления нет.':'Записано в Google Таблицу.');await refresh();}
  catch(e){const code=e instanceof Error?e.message:'sync_uncertain';setNotice(messages[code]||'Ошибка записи.');if(['insufficient_balance','already_sold','gift_not_owned','invalid_balance','invalid_request','request_conflict'].includes(code)){sessionStorage.removeItem(key);setPending(null);}}
  finally{setBusy(false);}
 }
 const start=(o:Omit<TestOperation,'id'>)=>send({...o,id:'TEST-'+crypto.randomUUID()});
 const disabled=busy||!!pending||!snapshot;
 const box={padding:20,border:'1px solid #383734',borderRadius:18,background:'#191b20',display:'grid',gap:12} as const;
 const input={padding:12,borderRadius:10,background:'#101216',color:'#fff',border:'1px solid #49443a',width:'100%'};
 const button={...input,background:'#d4b371',color:'#16130c',cursor:'pointer'};
 return <main style={{maxWidth:720,margin:'0 auto',padding:'32px 20px 80px',color:'#f3f0e9',display:'grid',gap:20}}>
  <a href="/" style={{color:'#d4b371'}}>← TinellGame</a><h1 style={{fontSize:28}}>Проверка учёта</h1>
  <p>Изолированный тест без оплаты и настоящих призов. Результат выбирается вручную для проверки записи. Игровой баланс хаба не меняется.</p>
  <section style={box}><span>Тестовый баланс</span><strong style={{fontSize:36}}>{snapshot?.balance??'—'}</strong><button style={button} disabled={busy} onClick={()=>refresh().catch(e=>setNotice(messages[e.message]||'Ошибка чтения'))}>Обновить из таблицы</button></section>
  <p role="status" aria-live="polite">{notice}</p>
  {pending&&<section style={box}><p>Есть неподтверждённая операция. Новые действия временно заблокированы.</p><button style={button} disabled={busy} onClick={()=>send(pending)}>Повторить отправку</button></section>}
  <section style={box}><h2>Пополнение</h2><label>Сумма от 10<input style={input} type="number" min="10" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button style={button} disabled={disabled||!Number.isInteger(Number(amount))||Number(amount)<10} onClick={()=>start({action:'topup',amount:Number(amount)})}>Записать тестовое пополнение</button></section>
  <section style={box}><h2>Результат открытия</h2><label>Списание<select style={input} value={price} onChange={e=>setPrice(e.target.value)}>{[10,25,50,100].map(v=><option key={v}>{v}</option>)}</select></label><label>Проверяемый приз<select style={input} value={prize} onChange={e=>setPrize(e.target.value)}><option value="star">Тестовые звёзды (+2)</option><option value="box">Подарочная коробка</option><option value="calendar">Desk Calendar — тест NFT</option></select></label><button style={button} disabled={disabled} onClick={()=>start({action:'open',price:Number(price),prize})}>Записать результат</button></section>
  <section style={box}><h2>Тестовый инвентарь</h2>{snapshot?.gifts.length? snapshot.gifts.map(g=><div key={g.opening}><p>{g.label}</p><button style={button} disabled={disabled} onClick={()=>start({action:'sell',opening:g.opening})}>Продать за {g.sale} тестовых единиц</button></div>):<p>Нет непроданных подарков.</p>}</section>
  <section style={box}><h2>Корректировка владельцем</h2><label>Изменение баланса: плюс или минус<input style={input} type="number" step="1" value={adjust} onChange={e=>setAdjust(e.target.value)}/></label><button style={button} disabled={disabled||!Number.isInteger(Number(adjust))||Number(adjust)===0} onClick={()=>start({action:'adjust',amount:Number(adjust)})}>Записать корректировку</button></section>
  <a style={{color:'#d4b371'}} href="https://docs.google.com/spreadsheets/d/18eNOszmn7KpJRhlHseTMQdKg-PjOin2xmIaFhOthIyo/edit" target="_blank" rel="noreferrer">Открыть журнал в Google Таблицах ↗</a>
 </main>;
}
