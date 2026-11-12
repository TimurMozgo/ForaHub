"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowRight,Star,X} from "lucide-react";
import {getCasePrizes,type CaseId} from "./case-prizes";

const boxes: {id:CaseId;name:string;price:number;tone:string}[]=[
  {id:"spark",name:"Искра",price:30,tone:"blue"},
  {id:"pulse",name:"Импульс",price:100,tone:"violet"},
  {id:"legend",name:"Легенда",price:300,tone:"gold"},
];
export function CaseShowcase(){
 const frame=useRef<HTMLIFrameElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const [selected,setSelected]=useState<number|null>(null),[active,setActive]=useState<number|null>(null),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{
  function receive(e:MessageEvent){if(e.origin!==window.location.origin||e.source!==frame.current?.contentWindow)return;
   if(e.data?.type==="gacha-ready"){setReady(true);setFailed(false);if(active!==null)frame.current?.contentWindow?.postMessage({type:"gacha-open",index:active},window.location.origin);}
   if(e.data?.type==="gacha-error"){setReady(false);setFailed(true);}
  }
  window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[active]);
 useEffect(()=>{if(active===null)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";function escape(e:KeyboardEvent){if(e.key==="Escape")setActive(null);}window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape);};},[active]);
 useEffect(()=>{if(selected===null)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.showModal();return()=>{document.body.style.overflow=previous;};},[selected]);
 function close(){dialog.current?.close();setSelected(null);}
 function open(){if(selected===null)return;const index=selected;close();setReady(false);setFailed(false);setActive(index);}
 const box=selected===null?null:boxes[selected];
 return <section className="hub-gacha">
  <div className="case-intro"><span className="eyebrow">КОЛЛЕКЦИЯ КЕЙСОВ</span><h1>Испытай удачу</h1><p>Выбери свой бокс и пробуди его энергию.</p></div>
  <div className="hub-case-cards">{boxes.map((b,i)=><button className={`hub-case-card ${b.tone}`} key={b.id} onClick={()=>setSelected(i)} aria-label={`${b.name}: посмотреть содержимое`}><img src={`/cases/cards/${b.id}.png`} alt={`Закрытый сундук ${b.name}`} width={1254} height={1254}/><span className="hub-case-card-info"><strong>{b.name}</strong><span className="hub-case-card-price"><Star size={15} fill="currentColor"/>{b.price}</span></span><span className="hub-case-card-caption">Содержимое кейса <ArrowRight size={15}/></span></button>)}</div>
  {active!==null&&<div className="hub-case-player" role="dialog" aria-modal="true" aria-label={`Открытие ${boxes[active].name}`}><div className="hub-case-player-panel"><button autoFocus className="hub-case-player-close" onClick={()=>setActive(null)} aria-label="Вернуться к карточкам"><X size={22}/></button><iframe key={version} ref={frame} src="/cases/three/index.html?embed=1" title={`Открытие ${boxes[active].name}`} className="hub-gacha-frame" loading="eager" allow="fullscreen"/>{!ready&&!failed&&<p className="hub-case-loading" role="status">Готовим открытие…</p>}{failed&&<div className="hub-gacha-error" role="alert">Не удалось запустить 3D-сцену. <button onClick={()=>{setFailed(false);setReady(false);setVersion(v=>v+1);}}>Попробовать снова</button></div>}</div></div>}
  <p className="hub-gacha-note">Демо: звёзды не списываются, призы не начисляются.</p>
  <dialog ref={dialog} className={`case-theater case-details-mode ${box?.tone||"blue"}`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-label={`Содержимое кейса ${box?.name||""}`}>
   {box&&<div className="case-details-inner"><header className="case-details-header"><div><span className="eyebrow">СОДЕРЖИМОЕ КЕЙСА</span><h2>{box.name}</h2></div><button className="case-icon-button" onClick={close} aria-label="Закрыть"><X size={20}/></button></header>
    <div className="case-details-scroll"><p className="hub-gacha-price">{box.price} Stars · демонстрационная коллекция</p><div className="case-prize-grid">{getCasePrizes(box.id).map(p=><article className={`case-prize-tile ${p.kind}`} key={p.id}><img src={p.image} alt={p.label} width={120} height={120} loading="lazy"/><span>{p.topPrize?"ГЛАВНЫЙ ПРИЗ":p.kind==="gem"?"КОЛЛЕКЦИОННЫЙ":"ПОДАРОК"}</span><h3>{p.label}</h3></article>)}<article className="case-prize-tile"><Star size={60} className="case-details-stars" fill="currentColor"/><span>ЗВЁЗДЫ</span><h3>1, 2 или 5 звёзд</h3></article></div><p className="case-collection-note">Коллекция для будущего запуска. В текущем 3D-демо показан пример звёздного приза; реальные шансы и выдача ещё не подключены.</p></div>
    <footer className="case-details-footer"><button className="case-details-open" onClick={open}>Посмотреть открытие<ArrowRight size={19}/></button><span>Без оплаты и начисления приза</span></footer>
   </div>}
  </dialog>
 </section>;
}
