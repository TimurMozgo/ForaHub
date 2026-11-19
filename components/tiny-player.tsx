'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
export function TinyPlayer({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [closing,setClosing]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const receive=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;if(event.data?.type==='tiny:exit-ready'){setClosing(true);timer.current=setTimeout(onClose,260);}if(event.data?.type==='tiny:save-error'){setSaving(false);setError(true);}};
  window.addEventListener('message',receive);return()=>{window.removeEventListener('message',receive);if(timer.current)clearTimeout(timer.current);document.body.style.overflow=old;previous?.focus();};
 },[onClose]);
 function exit(){if(saving||closing)return;setSaving(true);frame.current?.contentWindow?.postMessage({type:'tiny:exit'},location.origin);}
 return <dialog ref={dialog} className={`forge-player ${closing?'closing':''}`} aria-label="Tiny Swords внутри TinellGame" onCancel={e=>{e.preventDefault();exit();}}><div className="forge-toolbar"><button onClick={exit} disabled={saving}><ArrowLeft size={18}/>{saving?'Сохраняем…':'В хаб'}</button><strong>Tiny Swords</strong><span className="forge-save-status local">{error?'Память устройства недоступна':'Сохранение на устройстве'}</span></div><iframe ref={frame} src="/games/tiny-swords/index.html?v=2026.11.17.1" title="Игра Tiny Swords" allow="autoplay" onLoad={e=>e.currentTarget.classList.add('is-ready')}/></dialog>;
}
