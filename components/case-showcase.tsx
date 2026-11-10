"use client";

import { useEffect, useRef, useState } from "react";
import { CaseEnergy } from "./case-energy";
import { sparkFlight, risingHum, unsealSound, prizeChime } from "./case-soundtrack";
import { ArrowRight, Gift, Gem, Sparkles, Star, Volume2, VolumeX, X } from "lucide-react";

type CaseId = "free" | "spark" | "pulse" | "legend";
type Prize = { kind: "star" | "gift" | "gem"; amount?: number; label: string };
type Case = { id: CaseId; title: string; price: number; image: string; tone: string; subtitle: string };
type Phase = "opening" | "waiting" | "charging" | "holding" | "burst" | "revealed";

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
  const activeSounds = useRef<Set<AudioScheduledSourceNode>>(new Set());
  const master = useRef<GainNode | null>(null);
  const sequence = useRef(0);
  const tapsRef = useRef(0);
  const [taps, setTaps] = useState(0);
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Case | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const [prize, setPrize] = useState<Prize>(SAMPLE_PRIZES[0]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [closing, setClosing] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const background = new Image();
    background.src = "/cases/energy-chamber.png";
    void background.decode().catch(() => {});
  }, []);

  useEffect(() => () => {
    sequence.current++;
    activeSounds.current.forEach(source => {try {source.stop();} catch {}});
    activeSounds.current.clear();
    timers.current.forEach(clearTimeout);
    activeSounds.current.forEach(source => {try {source.stop();} catch {}});
    const current = context.current;
    context.current = null; master.current = null;
    if (current && current.state !== "closed") void current.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selected]);

  function audio() {
    if (typeof window === "undefined") return null;
    try {
      context.current ??= new AudioContext();
      if (!master.current) { master.current=context.current.createGain(); master.current.gain.value=audioOn.current?1:0; master.current.connect(context.current.destination); }
      if (context.current.state === "suspended") void context.current.resume();
      return context.current;
    } catch { return null; }
  }

  async function loadSounds() {
    const ctx=audio(); if (!ctx) return;
    await Promise.allSettled(["tap-v2.wav","land-v2.wav"].map(async file => {
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
    source.playbackRate.value=key==="land-v2" ? .55 : key==="tap-v2" ? 1.15 : 1;
    const filter=ctx.createBiquadFilter(); filter.type="lowpass";
    filter.frequency.value=key==="land-v2" ? 300 : key==="tap-v2" ? 1500 : 7000;
    source.connect(filter).connect(gain).connect(master.current);
    const length=Math.min(duration ?? buffer.duration,buffer.duration);
    gain.gain.setValueAtTime(volume,ctx.currentTime);
    gain.gain.setValueAtTime(volume,ctx.currentTime+Math.max(0,length-.08));
    gain.gain.linearRampToValueAtTime(0,ctx.currentTime+length);
    activeSounds.current.add(source);
    source.onended=()=>{activeSounds.current.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(0,0,length);
  }
  function playOpen(){playSound("tap-v2",.35,.18);}
  function trackSound(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    activeSounds.current.add(source);
    source.onended=()=>{activeSounds.current.delete(source);source.disconnect();nodes.forEach(node=>node.disconnect());};
  }
  function soundtrack(kind: "flight" | "hum" | "open" | "prize", index=0) {
    const ctx=audio();if(!ctx || !master.current)return;
    if(kind==="flight")sparkFlight(ctx,master.current,trackSound,index);
    else if(kind==="hum")risingHum(ctx,master.current,trackSound);
    else if(kind==="open")unsealSound(ctx,master.current,trackSound);
    else prizeChime(ctx,master.current,trackSound);
  }

  function clearSequence() {
    sequence.current++;
    activeSounds.current.forEach(source => {try {source.stop();} catch {}});
    activeSounds.current.clear();
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  async function start(c: Case) {
    clearSequence();
    const token = sequence.current;
    const result = samplePrize(c.id);
    tapsRef.current=0; setTaps(0);
    setFrame(0); setReady(false); setLoadError(false); setSettled(false);
    setSelected(c);
    setPrize(result);

    setPhase("opening");
    setClosing(false);
    if (!dialog.current?.open) dialog.current?.showModal();
    audio(); // Unlock audio during the user gesture, before loading assets.
    const soundsReady=loadSounds();
    const sheet = new Image();
    sheet.src = "/cases/" + c.id + "-frames.png";
    const backdrop = new Image(); backdrop.src = "/cases/energy-chamber.png";
    try { await Promise.all([sheet.decode(),backdrop.decode()]); } catch {
      if (token === sequence.current) setLoadError(true);
      return;
    }
    await soundsReady;
    if (token !== sequence.current) return;
    setReady(true);
    timers.current.push(setTimeout(() => { playSound("land-v2",.7,.4); },600));
    timers.current.push(setTimeout(() => setPhase("waiting"),900));
  }

  function tapChest() {
    if (phase !== "waiting" || tapsRef.current >= 3 || closing) return;
    const count=++tapsRef.current;
    setTaps(count); playOpen();
    if(count!==3) return;
    setPhase("charging"); setFrame(0);
    // Six seconds of gathering energy; two opening; two for the prize entrance.
    Array.from({length:13},(_,i)=>i).forEach(i => {
      timers.current.push(setTimeout(() => soundtrack("flight",i),i*390));
    });
    timers.current.push(setTimeout(() => soundtrack("hum"),850));
    timers.current.push(setTimeout(() => setPhase("holding"),5000));
    timers.current.push(setTimeout(() => {
      setPhase("burst"); setFrame(1); soundtrack("open");
    },6000));
    [2,3,4,5].forEach(index=>timers.current.push(setTimeout(()=>setFrame(index),6000+(index-1)*400)));
    timers.current.push(setTimeout(() => {setPhase("revealed");soundtrack("prize");},8000));
    timers.current.push(setTimeout(() => setSettled(true),10000));
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
      <div className={`case-theater-inner cinematic-chamber phase-${ready ? phase : "loading"}`}>
      {selected && <>{ready && <div className="case-chamber-backdrop" aria-hidden="true"/>}<div className="case-chamber-mist" aria-hidden="true"/><div className="case-chamber-light" aria-hidden="true"/><CaseEnergy key={selected.id} phase={ready ? phase : "loading"} tone={selected.tone}/></>}
      <div className="case-theater-top"><span className="case-theater-badge"><Sparkles size={14} /> ДЕМО ОТКРЫТИЯ</span><div><button className="case-icon-button" aria-label={soundEnabled ? "Выключить звук" : "Включить звук"} onClick={() => { audioOn.current = !soundEnabled; if(master.current) master.current.gain.value = !soundEnabled ? 1 : 0; setSoundEnabled(!soundEnabled); }}>{soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button className="case-icon-button" aria-label="Закрыть" onClick={close}><X size={20} /></button></div></div>
      {selected && <><div className="case-theater-title"><span className="eyebrow">{selected.price === 0 ? "БЕСПЛАТНЫЙ КЕЙС" : `${selected.price} STARS`}</span><h2>{selected.title}</h2></div>
        {phase !== "revealed" && <div className={`case-opening-stage case-energy-scene sprite-scene ${ready ? phase : "loading"}`}>
          <div className="case-energy-halo" aria-hidden="true"/><div className="case-energy-ring" aria-hidden="true"/>
          <div className={`case-sprite-stage ${phase === "burst" && frame === 5 ? "chest-departing" : ""}`}>
          <button type="button" className={`case-sprite tap-${taps}`} disabled={phase !== "waiting" || !ready || closing} onClick={tapChest} aria-label={phase === "waiting" ? `Нажать на сундук: ${taps} из 3` : `Кейс ${selected.title}, кадр ${frame+1} из 6`}>
          <span key={taps} className="case-tap-ripple" aria-hidden="true" style={{display:taps ? undefined : "none"}}/>
            {Array.from({length:6},(_,i)=><div key={i} className={`case-sprite-frame ${ready && frame === i ? "visible" : ""}`} style={{backgroundImage:`url(/cases/${selected.id}-frames.png)`,backgroundPosition:`${(i%3)*50}% ${i<3?0:100}%`}}/>)}
          </button></div>
          <div className="case-charge-caption"><span className="case-opening-caption" aria-live="polite">{loadError ? "Не удалось загрузить кейс. Закрой и попробуй ещё раз." : !ready ? "Готовим кейс…" : phase === "opening" ? "Сундук приближается…" : phase === "waiting" ? `Нажми на сундук · ${taps} / 3` : phase === "charging" ? "Энергия пробуждается…" : phase === "holding" ? "Уже не удержать…" : "Открываем!"}</span><div className="case-tap-indicators" aria-hidden="true">{[1,2,3].map(i=><i key={i} className={taps>=i?"lit":""}/>)}</div></div>
        </div>}
        {phase === "revealed" && <div className="case-reveal-stage" role="status"><div className="case-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%7)*.055}s`}} />)}</div><span className={`case-reward ${prize.kind}`}>{iconFor(prize, 76)}</span><span className="eyebrow">ТВОЙ РЕЗУЛЬТАТ</span><h3>{prize.label}</h3><p>Это демонстрация анимации. Приз не начислен.</p><button className="case-repeat" disabled={!settled} onClick={() => start(selected)}>Смотреть ещё <ArrowRight size={16}/></button></div>}
      </>}
      </div>
    </dialog>
  </>;
}
