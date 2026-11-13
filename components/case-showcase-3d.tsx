"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowRight,Star,X,Volume2,VolumeX} from "lucide-react";

import {CASE_CONFIG,getOpeningPrizes} from "./case-opening-prizes";
import {createPortal} from "react-dom";
import {GiftActions} from "./gift-actions";
import type {CaseReceipt} from "../lib/case-account";
import {CaseAudio} from "./case-audio";

type DailyReply={receipt?:CaseReceipt;nextAt:number;serverNow:number;prize?:{id:string};error?:string};
const boxes=CASE_CONFIG;

export function CaseShowcase(){
 const frame=useRef<HTMLIFrameElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const audio=useRef<CaseAudio|null>(null);
 const dailyPrize=useRef<string|null>(null),requestId=useRef<string|null>(null),busyRef=useRef(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[nextAt,setNextAt]=useState(0),[clock,setClock]=useState(Date.now()),[offset,setOffset]=useState(0);
 useEffect(()=>{let live=true;fetch('/api/cases/daily',{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<DailyReply>:null).then(data=>{if(live&&data){setNextAt(data.nextAt);setOffset(data.serverNow-Date.now());}}).catch(()=>{});const tick=setInterval(()=>setClock(Date.now()),1000);return()=>{live=false;clearInterval(tick);};},[]);
 const playerDialog=useRef<HTMLDialogElement>(null);
 const [opening,setOpening]=useState(true);
 const [won,setWon]=useState<CaseReceipt|null>(null),[selling,setSelling]=useState(false),[giftSold,setGiftSold]=useState(false);
 const [muted,setMuted]=useState(false);
 useEffect(()=>{try{setMuted(localStorage.getItem('case-sound-muted')==='1');}catch{}return()=>{audio.current?.dispose();audio.current=null;};},[]);
 function toggleSound(){const value=!muted;setMuted(value);audio.current?.unlock();audio.current?.setMuted(value);try{localStorage.setItem('case-sound-muted',value?'1':'0');}catch{}}
 const [selected,setSelected]=useState<number|null>(null),[active,setActive]=useState<number|null>(null),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{if(active===null){audio.current?.stop();return;}const node=playerDialog.current;node?.showModal();return()=>node?.close();},[active]);
 useEffect(()=>{
  function receive(e:MessageEvent){if(e.origin!==window.location.origin||e.source!==frame.current?.contentWindow)return;
   if(e.data?.type==="gacha-ready"){setReady(true);setFailed(false);if(active!==null)frame.current?.contentWindow?.postMessage({type:"gacha-open",index:active,prizeId:dailyPrize.current},window.location.origin);}
   if(e.data?.type==="gacha-error"){setReady(false);setFailed(true);audio.current?.stop();}
   if(e.data?.type==="gacha-audio"&&active!==null&&typeof e.data.cue==="string"){audio.current?.cue(e.data.cue,boxes[active].palette);if(e.data.cue==="charge")setOpening(true);if(e.data.cue==="prize")setOpening(false);}
  }
  window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[active]);
 useEffect(()=>{if(active===null)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";function escape(e:KeyboardEvent){if(e.key==="Escape")setActive(null);}window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape);};},[active]);
 useEffect(()=>{if(selected===null)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.showModal();return()=>{document.body.style.overflow=previous;};},[selected]);
 function close(){dialog.current?.close();setSelected(null);}
 async function open(repeatIndex?:number){
  const index=repeatIndex??selected;if(index===null||busyRef.current||selling)return;
  if(!audio.current)audio.current=new CaseAudio();audio.current.setMuted(muted);audio.current.unlock();
  busyRef.current=true;setBusy(true);setNotice('');dailyPrize.current=null;
  try{
   {
    const pendingKey='hub-case-pending:'+index;try{requestId.current=localStorage.getItem(pendingKey)||crypto.randomUUID();localStorage.setItem(pendingKey,requestId.current);}catch{requestId.current??=crypto.randomUUID();}const r=await fetch('/api/cases/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,caseIndex:index})});const data=await r.json() as DailyReply;
    if(data.nextAt)setNextAt(data.nextAt);if(data.serverNow)setOffset(data.serverNow-Date.now());
    if(!r.ok)throw new Error(r.status===401?'Войди в аккаунт, чтобы открыть кейс.':data.error==='cooldown'?'Ежедневный кейс доступен раз в 24 часа.':data.error==='insufficient_balance'?'Недостаточно Stars на балансе.':data.error==='account_capacity'?'Достигнут лимит истории аккаунта. Обратись в поддержку.':'Не удалось открыть кейс. Попробуй ещё раз.');
    if(!data.prize)throw new Error('Не удалось получить приз. Попробуй ещё раз.');dailyPrize.current=data.prize.id;setWon(data.receipt??null);setGiftSold(false);requestId.current=null;try{localStorage.removeItem(pendingKey);}catch{}window.dispatchEvent(new Event('hub-account-updated'));
   }
   close();setReady(false);setFailed(false);setOpening(true);setVersion(v=>v+1);setActive(index);
  }catch(e){setNotice(e instanceof Error?e.message:'Попробуй ещё раз.');}finally{busyRef.current=false;setBusy(false);}
 }

 const remainingSeconds=Math.max(0,Math.ceil((nextAt-clock-offset)/1000));
 const countdown=[Math.floor(remainingSeconds/3600),Math.floor(remainingSeconds%3600/60),remainingSeconds%60].map(n=>String(n).padStart(2,'0')).join(':');
 const dailyTimer=<span className={`case-daily-timer ${remainingSeconds?'':'is-ready'}`}><span>{remainingSeconds?'До следующего открытия':'Ежедневный кейс'}</span><strong role="timer" aria-label={remainingSeconds?'До открытия '+countdown:'Можно открыть'}>{remainingSeconds?countdown:'Можно открыть'}</strong></span>;
 const box=selected===null?null:boxes[selected];

 const pool=selected===null?[]:getOpeningPrizes(selected),availableGifts=pool.filter(p=>p.kind==='gift'),availableNFT=pool.filter(p=>p.kind==='gem').sort((a,b)=>b.costStars-a.costStars);
 return <section className="hub-gacha">
  <div className="case-intro"><span className="eyebrow">КОЛЛЕКЦИЯ КЕЙСОВ</span><h1>Испытай удачу</h1><p>Выбери свой бокс и пробуди его энергию.</p></div>
  <div className="hub-case-cards">{boxes.map((b,i)=><button className={`hub-case-card ${b.tone}`} key={b.id} onClick={()=>{setNotice('');setSelected(i);}} aria-label={`${b.name}: посмотреть содержимое`}><img src={`/cases/cards/${b.art}.png`} alt={`Закрытый сундук ${b.name}`} width={1254} height={1254}/><span className="hub-case-card-info"><strong>{b.name}</strong><span className="hub-case-card-price">{b.price===0?"Бесплатно":<><Star size={15} fill="currentColor"/>{b.price}</>}</span></span><span className="hub-case-card-caption">Содержимое кейса <ArrowRight size={15}/></span></button>)}</div>

  {active!==null&&createPortal(<dialog ref={playerDialog} onCancel={e=>{e.preventDefault();setActive(null);}} style={{position:"fixed",inset:0,width:"100vw",height:"100dvh",maxWidth:"none",maxHeight:"none",margin:0,padding:0,border:0,borderRadius:0,overflow:"hidden",background:"#080e19"}} className={`hub-case-player ${opening?"is-opening":""}`} aria-modal="true" aria-label={`Открытие ${boxes[active].name}`}><div className="hub-case-player-panel"><button className="hub-case-sound" onClick={toggleSound} aria-pressed={!muted} aria-label={muted?"Включить звук":"Выключить звук"}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button autoFocus className="hub-case-player-close" onClick={()=>setActive(null)} aria-label="Вернуться к карточкам"><X size={22}/></button><iframe key={version} ref={frame} src={`/cases/three/index.html?embed=1&case=${active}&v=nft-pools-20261113-5`} title={`Открытие ${boxes[active].name}`} className="hub-gacha-frame" loading="eager" allow="fullscreen; autoplay"/>{!opening&&won&&<div className="case-win-actions">{won.prize.kind!=='star'&&!giftSold&&<button className="case-claim-gift" disabled={selling||busy} onClick={()=>setActive(null)}>Забрать подарок</button>}{won.prize.kind!=='star'&&<GiftActions key={won.requestId} prize={won.prize} openingId={won.requestId} onBusy={setSelling} onSold={()=>setGiftSold(true)}/>}<button className="case-play-again" disabled={busy||selling||(active===0&&remainingSeconds>0)} onClick={()=>void open(active)}>{busy?'Подготовка…':active===0&&remainingSeconds>0?'Через '+countdown:'Играть снова'+(boxes[active].price?' · '+boxes[active].price+' Stars':'')}</button>{notice&&<p role="alert">{notice}</p>}</div>}{!ready&&!failed&&<p className="hub-case-loading" role="status">Готовим открытие…</p>}{failed&&<div className="hub-gacha-error" role="alert">Не удалось запустить 3D-сцену. <button onClick={()=>{setFailed(false);setReady(false);setVersion(v=>v+1);}}>Попробовать снова</button></div>}</div></dialog>,document.body)}

  <dialog ref={dialog} className={`case-theater case-details-mode ${box?.tone||"blue"}`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-label={`Содержимое кейса ${box?.name||""}`}>
   {box&&<div className="case-details-inner"><header className="case-details-header"><div><span className="eyebrow">СОДЕРЖИМОЕ КЕЙСА</span><h2>{box.name}</h2></div><button className="case-icon-button" onClick={close} aria-label="Закрыть"><X size={20}/></button></header>
    <div className="case-details-scroll"><p className="hub-gacha-price">{box.price===0?'Бесплатно · раз в 24 часа':box.price+' Stars'}</p>{selected===0&&dailyTimer}
    {availableNFT.length>0&&<><h3 className="case-list-title">Коллекционные подарки</h3><div className="case-prize-grid">{availableNFT.map((p,i)=><article className={`case-prize-tile gem ${i===0?'case-nft-top':''}`} key={p.id}><img src={p.image} alt={p.label} width={120} height={120} loading="lazy"/><span>{i===0?'ГЛАВНЫЙ NFT':'NFT'}</span><h3>{p.label}</h3></article>)}</div></>}
    {availableGifts.length>0&&<><h3 className="case-list-title">Обычные подарки</h3><div className="case-prize-grid">{availableGifts.map(p=><article className="case-prize-tile gift" key={p.id}><img src={p.image} alt={p.label} width={120} height={120} loading="lazy"/><span>ПОДАРОК</span><h3>{p.label}</h3></article>)}</div></>}
    <h3 className="case-list-title">Звёзды</h3><div className="case-prize-grid"><article className="case-prize-tile"><Star size={60} className="case-details-stars" fill="currentColor"/><h3>Звёзды</h3></article></div>
    </div>
    <footer className="case-details-footer">{notice&&<p role="alert" className="case-open-notice">{notice}</p>}<button className="case-details-open" disabled={busy||(selected===0&&nextAt>clock+offset)} onClick={()=>void open()}>{busy?'Подготовка…':selected===0&&nextAt>clock+offset?'Пока недоступен':'Открыть кейс'}<ArrowRight size={19}/></button></footer>

   </div>}
  </dialog>
 </section>;
}
