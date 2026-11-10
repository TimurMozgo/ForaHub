"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Gift, Gem, Sparkles, Star, Volume2, VolumeX, X } from "lucide-react";

type CaseId = "free" | "spark" | "pulse" | "legend";
type Prize = { kind: "star" | "gift" | "gem"; amount?: number; label: string };
type Case = { id: CaseId; title: string; price: number; image: string; tone: string; subtitle: string };
type Phase = "opening" | "charging" | "holding" | "burst" | "revealed";

const cases: Case[] = [
  { id: "free", title: "Ежедневный", price: 0, image: "/cases/case-free.png", tone: "cyan", subtitle: "Твоё первое открытие" },
  { id: "spark", title: "Искра", price: 30, image: "/cases/case-30.png", tone: "blue", subtitle: "С чего начинается удача" },
  { id: "pulse", title: "Импульс", price: 100, image: "/cases/case-100.png", tone: "violet", subtitle: "Больше света, больше интриги" },
  { id: "legend", title: "Легенда", price: 300, image: "/cases/case-300.png", tone: "gold", subtitle: "Главный кейс коллекции" },
];

const SAMPLE_PRIZES: Prize[] = [
  { kind: "star", amount: 1, label: "1 звезда" },
  { kind: "star", amount: 2, label: "2 звезды" },
  { kind: "star", amount: 5, label: "5 звёзд" },
  { kind: "gift", label: "Подарок" },
  { kind: "gem", label: "NFT-подарок" },
];


function iconFor(prize: Prize, size = 35) {
  if (prize.kind === "gem") return <Gem size={size} strokeWidth={1.6} />;
  if (prize.kind === "gift") return <Gift size={size} strokeWidth={1.6} />;
  return <Star size={size} fill="currentColor" strokeWidth={1.4} />;
}

function samplePrize(caseId: CaseId): Prize {
  // Preview-only outcomes. No balance, inventory, or payment is changed.
  const choices = caseId === "free" ? SAMPLE_PRIZES.slice(0, 2) : caseId === "spark" ? SAMPLE_PRIZES.slice(0, 4) : caseId === "pulse" ? [SAMPLE_PRIZES[2], SAMPLE_PRIZES[3]] : [SAMPLE_PRIZES[3]];
  return choices[Math.floor(Math.random() * choices.length)];
}

export function CaseShowcase() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const context = useRef<AudioContext | null>(null);
  const audioOn = useRef(true);
  const buffers = useRef<Record<string,AudioBuffer>>({});
  const activeSounds = useRef<Set<AudioBufferSourceNode>>(new Set());
  const master = useRef<GainNode | null>(null);
  const sequence = useRef(0);
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Case | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const [prize, setPrize] = useState<Prize>(SAMPLE_PRIZES[0]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => () => {
    sequence.current++;
    activeSounds.current.forEach(source => {try {source.stop();} catch {}});
    activeSounds.current.clear();
    timers.current.forEach(clearTimeout);
    activeSounds.current.forEach(source => {try {source.stop();} catch {}});
    const current = context.current;
    context.current = null;
    if (current && current.state !== "closed") void current.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selected]);

  function audio() {
    if (!audioOn.current || typeof window === "undefined") return null;
    try {
      context.current ??= new AudioContext();
      if (!master.current) { master.current=context.current.createGain(); master.current.connect(context.current.destination); }
      if (context.current.state === "suspended") void context.current.resume();
      return context.current;
    } catch { return null; }
  }

  async function loadSounds() {
    const ctx=audio(); if (!ctx) return;
    await Promise.allSettled(["unlock.flac","charge.wav","open.flac","reward.wav"].map(async file => {
      const key=file.split(".")[0]; if (buffers.current[key]) return;
      const response=await fetch("/cases/audio/"+file);
      if (!response.ok) throw new Error("Audio unavailable");
      buffers.current[key]=await ctx.decodeAudioData(await response.arrayBuffer());
    }));
  }
  function playSound(key:string, volume:number, duration?:number) {
    const ctx=audio(), buffer=buffers.current[key];
    if(!ctx || !buffer || !master.current) return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=buffer; gain.gain.value=volume;
    source.connect(gain).connect(master.current);
    const length=Math.min(duration ?? buffer.duration,buffer.duration);
    gain.gain.setValueAtTime(volume,ctx.currentTime);
    gain.gain.setValueAtTime(volume,ctx.currentTime+Math.max(0,length-.08));
    gain.gain.linearRampToValueAtTime(0,ctx.currentTime+length);
    activeSounds.current.add(source);
    source.onended=()=>{activeSounds.current.delete(source);source.disconnect();gain.disconnect();};
    source.start(0,0,length);
  }
  function playOpen(){playSound("unlock",.4,.6);}
  function playCharge(){playSound("charge",.7);}
  function playReveal(){playSound("reward",.65);}

  function clearSequence() {
    sequence.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  async function start(c: Case) {
    clearSequence();
    const token = sequence.current;
    const result = samplePrize(c.id);
    setFrame(0); setReady(false); setLoadError(false);
    setSelected(c);
    setPrize(result);

    setPhase("opening");
    setClosing(false);
    if (!dialog.current?.open) dialog.current?.showModal();
    audio(); // Unlock audio during the user gesture, before loading assets.
    const soundsReady=loadSounds();
    const sheet = new Image();
    sheet.src = "/cases/" + c.id + "-frames.png";
    try { await sheet.decode(); } catch {
      if (token === sequence.current) setLoadError(true);
      return;
    }
    await soundsReady;
    if (token !== sequence.current) return;
    setReady(true);
    playOpen();
    timers.current.push(setTimeout(() => { setPhase("charging"); setFrame(1); playCharge(); },650));
    timers.current.push(setTimeout(() => setPhase("holding"),2850));
    timers.current.push(setTimeout(() => {
      setPhase("burst"); setFrame(2); playSound("open",.35,.7);
    },3250));
    [3,4,5].forEach((index) => timers.current.push(setTimeout(() => setFrame(index),3250+(index-2)*170)));
    timers.current.push(setTimeout(() => {setPhase("revealed");playReveal();},4500));
  }

  function close() {
    if (closing || !dialog.current?.open) return;
    clearSequence();
    setClosing(true);
    timers.current.push(setTimeout(() => {
      dialog.current?.close();
      setSelected(null);
      setClosing(false);
    }, 220));
  }

  return <>
    <div className="case-intro"><span className="eyebrow">КОЛЛЕКЦИЯ КЕЙСОВ</span><h1>Испытай удачу</h1><p>Четыре кейса. Один момент, который хочется пережить ещё раз.</p></div>
    <div className="case-grid">{cases.map(c => <button key={c.id} className={`case-card ${c.tone}`} onClick={() => start(c)} aria-label={`Посмотреть открытие: ${c.title}`}>
      <span className="case-card-art" style={{ backgroundImage: `url(${c.image})` }}><span className="case-card-shine" /></span>
      <span className="case-card-copy"><span className="case-card-kicker">{c.price === 0 ? "ЕЖЕДНЕВНЫЙ" : "КЕЙС GAME HUB"}</span><strong>{c.title}</strong><small>{c.subtitle}</small><span className="case-card-bottom"><span>{c.price === 0 ? "Бесплатно" : <><Star size={14} fill="currentColor" /> {c.price} Stars</>}</span><span className="case-card-arrow"><ArrowRight size={16} /></span></span></span>
    </button>)}</div>
    <div className="case-preview-note"><Sparkles size={18} /><p><strong>Пока это просмотр анимации.</strong> Оплата, начисление звёзд и выдача подарков появятся после подключения бота и призового фонда.</p></div>
    <dialog ref={dialog} className={`case-theater ${selected?.tone || "cyan"} ${closing ? "closing" : ""}`} aria-label={`Открытие кейса ${selected?.title || ""}`} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="case-theater-inner"><div className="case-theater-top"><span className="case-theater-badge"><Sparkles size={14} /> ДЕМО ОТКРЫТИЯ</span><div><button className="case-icon-button" aria-label={soundEnabled ? "Выключить звук" : "Включить звук"} onClick={() => { audioOn.current = !soundEnabled; if(master.current) master.current.gain.value = !soundEnabled ? 1 : 0; setSoundEnabled(!soundEnabled); }}>{soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button className="case-icon-button" aria-label="Закрыть" onClick={close}><X size={20} /></button></div></div>
      {selected && <><div className="case-theater-title"><span className="eyebrow">{selected.price === 0 ? "БЕСПЛАТНЫЙ КЕЙС" : `${selected.price} STARS`}</span><h2>{selected.title}</h2></div>
        {phase !== "revealed" && <div className={`case-opening-stage case-energy-scene sprite-scene ${ready ? phase : "loading"}`}>
          <div className="case-energy-halo" aria-hidden="true"/><div className="case-energy-ring" aria-hidden="true"/>
          <div className="case-energy-sparks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${12+(i*17)%76}%`,top:`${20+(i*23)%60}%`,animationDelay:`${i*.13}s`}}/>)}</div>
          <div className="case-sprite" role="img" aria-label={`Кейс ${selected.title}, кадр ${frame+1} из 6`}>
            {Array.from({length:6},(_,i)=><div key={i} className={`case-sprite-frame ${ready && frame === i ? "visible" : ""}`} style={{backgroundImage:`url(/cases/${selected.id}-frames.png)`,backgroundPosition:`${(i%3)*50}% ${i<3?0:100}%`}}/>)}
          </div>
          {phase === "burst" && frame === 5 && <span className="case-emerging-prize">{iconFor(prize,76)}</span>}
          <span className="case-opening-caption">{loadError ? "Не удалось загрузить кейс. Закрой и попробуй ещё раз." : !ready ? "Готовим кейс…" : phase === "opening" ? "Пробуждаем кейс…" : phase === "charging" ? "Энергия нарастает…" : phase === "holding" ? "Тот самый момент…" : "Открываем!"}</span>
        </div>}
        {phase === "revealed" && <div className="case-reveal-stage" role="status"><div className="case-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%7)*.055}s`}} />)}</div><span className={`case-reward ${prize.kind}`}>{iconFor(prize, 76)}</span><span className="eyebrow">ТВОЙ РЕЗУЛЬТАТ</span><h3>{prize.label}</h3><p>Это демонстрация анимации. Приз не начислен.</p><button className="case-repeat" onClick={() => start(selected)}>Смотреть ещё <ArrowRight size={16}/></button></div>}
      </>}
      </div>
    </dialog>
  </>;
}
