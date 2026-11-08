"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Cloud,LoaderCircle,ShieldCheck} from "lucide-react";
export function DeadPlayer({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null),exitTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [src,setSrc]=useState(""),[status,setStatus]=useState("Загружаем сохранение…"),[kind,setKind]=useState("loading"),[exiting,setExiting]=useState(false),[closing,setClosing]=useState(false),[error,setError]=useState(false);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const prev=document.activeElement as HTMLElement;dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow="hidden";const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    fetch('/api/dead-route/version',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<{version:string}>;}).then(v=>{if(!/^[0-9.]+$/.test(v.version))throw new Error();setSrc(`/games/dead-route/index.html?v=${v.version}`);}).catch(()=>setError(true)).finally(()=>clearTimeout(timer));
    let finishing=false;function finish(){if(finishing)return;finishing=true;if(exitTimer.current)clearTimeout(exitTimer.current);setClosing(true);exitTimer.current=setTimeout(()=>closeRef.current(),260);}
    const listener=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==frame.current?.contentWindow)return;if(e.data?.type==='dead:status'&&typeof e.data.text==='string'){setStatus(e.data.text);setKind(e.data.kind);}if(e.data?.type==='dead:exit-ready')finish();};window.addEventListener('message',listener);
    return ()=>{controller.abort();clearTimeout(timer);if(exitTimer.current)clearTimeout(exitTimer.current);window.removeEventListener('message',listener);document.body.style.overflow=old;prev?.focus();};},[]);
  function exit(){if(exiting||closing)return;setExiting(true);frame.current?.contentWindow?.postMessage({type:'dead:exit'},location.origin);exitTimer.current=setTimeout(()=>{setClosing(true);exitTimer.current=setTimeout(()=>closeRef.current(),260);},2000);}
  return <dialog ref={dialog} className={`forge-player ${closing?'closing':''}`} aria-label="Dead Route внутри Game Hub" onCancel={e=>{e.preventDefault();exit();}}><div className="forge-toolbar"><button onClick={exit} disabled={exiting} className="forge-back"><ArrowLeft size={18}/>{exiting?'Сохраняем…':'В хаб'}</button><strong>Dead Route</strong><span className={`forge-save-status ${kind}`} title={status}>{kind==='synced'?<ShieldCheck size={15}/>:kind==='syncing'?<LoaderCircle size={15} className="spin"/>:<Cloud size={15}/>}<span>{status}</span></span></div>{error?<div className="forge-load"><h2>Не удалось загрузить игру</h2><p>Вернись в каталог и попробуй ещё раз. Сохранения остаются на месте.</p><button className="gold-button" onClick={exit}>В хаб</button></div>:src?<iframe ref={frame} src={src} title="Игра Dead Route" allow="autoplay"/>:<div className="forge-load"><LoaderCircle className="spin" size={28}/><p>Открываем Dead Route…</p></div>}</dialog>;
}

