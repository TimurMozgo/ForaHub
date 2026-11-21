'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft} from 'lucide-react';

export function PixelPlayer({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),closeRef=useRef(onClose);
 closeRef.current=onClose;
 const [closing,setClosing]=useState(false);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{if(timer.current)clearTimeout(timer.current);document.body.style.overflow=old;previous?.focus();};},[]);
 function exit(){if(closing)return;frame.current?.contentWindow?.postMessage({type:'pixel:exit'},location.origin);setClosing(true);timer.current=setTimeout(()=>closeRef.current(),260);}
 return <dialog ref={dialog} className={`forge-player ${closing?'closing':''}`} aria-label="Pixel Rush внутри TinellGame" onCancel={e=>{e.preventDefault();exit();}}><div className="forge-toolbar"><button className="forge-back" onClick={exit} disabled={closing}><ArrowLeft size={18}/>В хаб</button><strong>Pixel Rush</strong><span className="forge-save-status local" title="Уровни, монеты и кристаллы сохраняются. Текущий уровень начинается заново.">Сохранение на устройстве</span></div><iframe ref={frame} src="/games/pixel-rush/index.html?v=2026.11.21.1" title="Игра Pixel Rush" allow="autoplay; fullscreen" onLoad={e=>e.currentTarget.classList.add('is-ready')}/></dialog>;
}
