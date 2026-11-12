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
 const [selected,setSelected]=useState<number|null>(null),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{
  function receive(e:MessageEvent){if(e.origin!==window.location.origin||e.source!==frame.current?.contentWindow)return;
   if(e.data?.type==="gacha-ready"){setReady(true);setFailed(false);}
   if(e.data?.type==="gacha-error"){setReady(false);setFailed(true);}
  }
  window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[]);
 useEffect(()=>{if(selected===null)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.showModal();return()=>{document.body.style.overflow=previous;};},[selected]);
 function close(){dialog.current?.close();setSelected(null);}
 function open(){if(selected===null||!ready)return;frame.current?.contentWindow?.postMessage({type:"gacha-open",index:selected},window.location.origin);close();frame.current?.scrollIntoView({behavior:"smooth",block:"start"});}
 const box=selected===null?null:boxes[selected];
 return <section className="hub-gacha">
  <div className="case-intro"><span className="eyebrow">КОЛЛЕКЦИЯ КЕЙСОВ</span><h1>Испытай удачу</h1><p>Выбери свой бокс и пробуди его энергию.</p></div>
  <iframe key={version} ref={frame} src="/cases/three/index.html?embed=1" title="Три 3D-бокса: Искра, Импульс и Легенда" className="hub-gacha-frame" loading="eager" allow="fullscreen"/>
  {failed&&<div className="hub-gacha-error" role="alert">Не удалось запустить 3D-сцену. <button onClick={()=>{setFailed(false);setReady(false);setVersion(v=>v+1);}}>Попробовать снова</button></div>}
  <div className="hub-gacha-contents">{boxes.map((b,i)=><button key={b.id} onClick={()=>setSelected(i)}><strong>{b.name}</strong><span>Содержимое <ArrowRight size={14}/></span></button>)}</div>
  <p className="hub-gacha-note">Демо: звёзды не списываются, призы не начисляются.</p>
  <dialog ref={dialog} className={`case-theater case-details-mode ${box?.tone||"blue"}`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-label={`Содержимое кейса ${box?.name||""}`}>
   {box&&<div className="case-details-inner"><header className="case-details-header"><div><span className="eyebrow">СОДЕРЖИМОЕ КЕЙСА</span><h2>{box.name}</h2></div><button className="case-icon-button" onClick={close} aria-label="Закрыть"><X size={20}/></button></header>
    <div className="case-details-scroll"><p className="hub-gacha-price">{box.price} Stars · демонстрационная коллекция</p><div className="case-prize-grid">{getCasePrizes(box.id).map(p=><article className={`case-prize-tile ${p.kind}`} key={p.id}><img src={p.image} alt={p.label} width={120} height={120} loading="lazy"/><span>{p.topPrize?"ГЛАВНЫЙ ПРИЗ":p.kind==="gem"?"КОЛЛЕКЦИОННЫЙ":"ПОДАРОК"}</span><h3>{p.label}</h3></article>)}<article className="case-prize-tile"><Star size={60} className="case-details-stars" fill="currentColor"/><span>ЗВЁЗДЫ</span><h3>1, 2 или 5 звёзд</h3></article></div><p className="case-collection-note">Коллекция для будущего запуска. В текущем 3D-демо показан пример звёздного приза; реальные шансы и выдача ещё не подключены.</p></div>
    <footer className="case-details-footer"><button className="case-details-open" disabled={!ready} onClick={open}>{ready?"Посмотреть открытие":"Загрузка 3D-сцены…"}<ArrowRight size={19}/></button><span>Без оплаты и начисления приза</span></footer>
   </div>}
  </dialog>
 </section>;
}
