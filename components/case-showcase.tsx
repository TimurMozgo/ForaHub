"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Gift, Gem, Sparkles, Star, Volume2, VolumeX, X } from "lucide-react";

type CaseId = "free" | "spark" | "pulse" | "legend";
type Prize = { kind: "star" | "gift" | "gem"; amount?: number; label: string };
type Case = { id: CaseId; title: string; price: number; image: string; tone: string; subtitle: string };
type Phase = "opening" | "rolling" | "revealed";

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
const FINAL_INDEX = 32;

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

function makeStrip(final: Prize): Prize[] {
  const strip = Array.from({ length: 38 }, () => {
    const roll = Math.random();
    return roll < .44 ? SAMPLE_PRIZES[0] : roll < .69 ? SAMPLE_PRIZES[1] : roll < .82 ? SAMPLE_PRIZES[2] : roll < .97 ? SAMPLE_PRIZES[3] : SAMPLE_PRIZES[4];
  });
  strip[FINAL_INDEX] = final;
  return strip;
}

function soundTone(ctx: AudioContext, start: number, end: number, length: number, volume: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), now + length);
  gain.gain.setValueAtTime(Math.max(volume, .0001), now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + length + .01);
}

function soundNoise(ctx: AudioContext, length: number, volume: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = 900;
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

export function CaseShowcase() {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const context = useRef<AudioContext | null>(null);
  const audioOn = useRef(true);
  const [selected, setSelected] = useState<Case | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const [strip, setStrip] = useState<Prize[]>([]);
  const [prize, setPrize] = useState<Prize>(SAMPLE_PRIZES[0]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    void context.current?.close();
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
      if (context.current.state === "suspended") void context.current.resume();
      return context.current;
    } catch { return null; }
  }

  function playOpen() {
    const ctx = audio();
    if (!ctx) return;
    soundTone(ctx, 245, 90, .3, .09, "triangle");
    soundNoise(ctx, .12, .11);
    timers.current.push(setTimeout(() => { if (audioOn.current) { soundTone(ctx, 470, 940, .35, .055); soundNoise(ctx, .22, .06); } }, 350));
  }

  function playTick() {
    const ctx = audio();
    if (ctx) soundTone(ctx, 940, 510, .055, .028, "triangle");
  }

  function playReveal() {
    const ctx = audio();
    if (!ctx) return;
    soundNoise(ctx, .24, .045);
    [523, 659, 784, 1047].forEach((freq, index) => {
      timers.current.push(setTimeout(() => {
        if (audioOn.current) soundTone(ctx, freq, freq * 1.015, .55, .035, "sine");
      }, index * 78));
    });
  }

  function clearSequence() {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function start(c: Case) {
    clearSequence();
    const result = samplePrize(c.id);
    setSelected(c);
    setPrize(result);
    setStrip(makeStrip(result));
    setPhase("opening");
    setClosing(false);
    if (!dialog.current?.open) dialog.current?.showModal();
    playOpen();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("revealed");
      return;
    }
    timers.current.push(setTimeout(() => {
      setPhase("rolling");
      raf.current = requestAnimationFrame(() => { raf.current = requestAnimationFrame(roll); });
    }, 900));
  }

  function roll() {
    const cards = track.current?.children;
    const target = cards?.[FINAL_INDEX] as HTMLElement | undefined;
    if (!target || !viewport.current || !track.current) return;
    const center = viewport.current.clientWidth / 2;
    const end = center - target.offsetLeft - target.offsetWidth / 2;
    const started = performance.now();
    let previous = -1;
    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / 4850);
      const eased = 1 - Math.pow(1 - t, 4.5);
      const x = end * eased;
      if (track.current) track.current.style.transform = `translate3d(${x}px,0,0)`;
      const current = Math.floor((center - x) / (target.offsetWidth + 10));
      if (current > previous && current < FINAL_INDEX + 1) { if (previous >= 0) playTick(); previous = current; }
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else timers.current.push(setTimeout(() => { setPhase("revealed"); playReveal(); }, 330));
    };
    raf.current = requestAnimationFrame(frame);
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
      <div className="case-theater-inner"><div className="case-theater-top"><span className="case-theater-badge"><Sparkles size={14} /> ДЕМО ОТКРЫТИЯ</span><div><button className="case-icon-button" aria-label={soundEnabled ? "Выключить звук" : "Включить звук"} onClick={() => { audioOn.current = !soundEnabled; setSoundEnabled(!soundEnabled); }}>{soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button className="case-icon-button" aria-label="Закрыть" onClick={close}><X size={20} /></button></div></div>
      {selected && <><div className="case-theater-title"><span className="eyebrow">{selected.price === 0 ? "БЕСПЛАТНЫЙ КЕЙС" : `${selected.price} STARS`}</span><h2>{selected.title}</h2></div>
        {phase === "opening" && <div className="case-opening-stage"><div className="case-opening-glow"/><div className="case-chest"><div className="case-chest-body" style={{ backgroundImage: `url(${selected.image})` }}/><div className="case-chest-lid" style={{ backgroundImage: `url(${selected.image})` }}/></div><span className="case-opening-caption">Кейс открывается…</span></div>}
        {phase === "rolling" && <div className="case-roll-stage"><div className="case-roll-viewport" ref={viewport}><div className="case-roll-track" ref={track}>{strip.map((item, i) => <div className={`case-roll-item ${item.kind}`} key={i}>{iconFor(item)}<span>{item.kind === "star" ? `${item.amount} ⭐` : item.kind === "gem" ? "NFT" : "Подарок"}</span></div>)}</div><div className="case-roll-marker"/></div><div className="case-roll-status"><span className="case-roll-dots"><i/><i/><i/></span>Выбираем приз…</div></div>}
        {phase === "revealed" && <div className="case-reveal-stage" role="status"><div className="case-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%7)*.055}s`}} />)}</div><span className={`case-reward ${prize.kind}`}>{iconFor(prize, 76)}</span><span className="eyebrow">ТВОЙ РЕЗУЛЬТАТ</span><h3>{prize.label}</h3><p>Это демонстрация анимации. Приз не начислен.</p><button className="case-repeat" onClick={() => start(selected)}>Смотреть ещё <ArrowRight size={16}/></button></div>}
      </>}
      </div>
    </dialog>
  </>;
}
