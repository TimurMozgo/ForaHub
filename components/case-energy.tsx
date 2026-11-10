"use client";

import { useEffect, useRef } from "react";

// A single canvas keeps hundreds of moving sparks out of React's render loop.
export function CaseEnergy({ phase, tone }: { phase: string; tone: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ phase, since: 0, chargeStart: 0 });
  useEffect(() => {
    const now = performance.now();
    state.current = { phase, since: now, chargeStart: phase === "charging" ? now : state.current.chargeStart };
  }, [phase]);

  useEffect(() => {
    const el = canvas.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors: Record<string, string> = { cyan: "65,239,245", blue: "85,150,255", violet: "198,110,255", gold: "255,193,72" };
    const color = colors[tone] || colors.cyan;
    let width = 1, height = 1, targetX = 0, targetY = 0, raf = 0, previous = 0;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const stage = host.querySelector<HTMLElement>(".case-sprite-stage");
      // Use layout offsets, not the falling/shaking element's transformed bounds.
      let top = 0;
      for(let node: HTMLElement | null = stage; node && node !== host; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
      targetX = width / 2;
      targetY = stage ? top + stage.offsetHeight * .58 : height * .62;
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const glow = (x: number, y: number, radius: number, opacity: number) => {
      const fill = ctx.createRadialGradient(x,y,0,x,y,radius);
      fill.addColorStop(0,`rgba(${color},${opacity})`); fill.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=fill; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    };
    const point = (lane: number, t: number, time: number) => {
      const side = lane % 2 ? 1 : -1;
      const startX = width / 2 + side * width * (.58 + (lane % 3) * .08);
      const startY = height * (.17 + Math.floor(lane / 2) * .105);
      const u = 1 - t;
      const bend = Math.sin(time * .5 + lane) * width * .025;
      return {
        x: u*u*u*startX + 3*u*u*t*(width/2+side*width*.48) + 3*u*t*t*(targetX+side*width*.22+bend) + t*t*t*targetX,
        y: u*u*u*startY + 3*u*u*t*(startY+height*.28) + 3*u*t*t*(targetY-height*.13+bend) + t*t*t*targetY,
      };
    };
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - previous < (motion.matches ? 50 : 30)) return;
      previous = now;
      const s = state.current, time = now / 1000;
      const active = s.phase === "charging" || s.phase === "holding";
      const progress = active ? Math.min(1, (now - s.chargeStart) / 15000) : 0;
      const release = s.phase === "burst" ? Math.max(0, 1 - (now-s.since)/2000) : 0;
      host.style.setProperty("--charge", String(progress));
      host.style.setProperty("--shake", `${motion.matches ? 0 : 2 + progress * 7}px`);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      // Slowly moving atmosphere, including before the player taps.
      glow(width*(.35+.15*Math.sin(time*.21)),height*.79,width*.65,.08);
      glow(width*(.65+.13*Math.cos(time*.17)),height*.42,width*.5,.05);
      const count = motion.matches ? 30 : 70;
      for (let i=0;i<count;i++) {
        const x=((i*97.3+Math.sin(time*.3+i)*14)%width+width)%width;
        const y=(height+(i*53.7-time*(7+i%8))%height)%height;
        ctx.fillStyle=`rgba(${color},${.12+.24*(.5+.5*Math.sin(time+i))})`;
        ctx.beginPath();ctx.arc(x,y,i%4===0?1.3:.7,0,Math.PI*2);ctx.fill();
      }
      if(active) {
        const intensity = .3 + progress*.7;
        const elapsed = now-s.chargeStart;
        const arrived = Math.min(1, Math.max(0,(elapsed-850)/1000));
        glow(targetX,targetY,width*(.22+progress*.2),arrived*(.08+progress*.18));
        // Curved ribbons and tapered spark trails all converge INTO the clasp.
        for(let lane=0;lane<6;lane++) {
          const age = elapsed-lane*65;
          if(age<=0) continue;
          const head=Math.min(1,age/900);
          ctx.beginPath();
          for(let j=0;j<=45;j++){const p=point(lane,head*j/45,time);if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
          ctx.strokeStyle=`rgba(${color},${intensity*.09})`;ctx.lineWidth=motion.matches?1:2;ctx.stroke();
        }
        const sparks=motion.matches?45:260;
        for(let i=0;i<sparks;i++) {
          const lane=i%6;
          // Every spark is born at the edge, never pre-populated along the path.
          const age=elapsed-Math.floor(i/6)*24-lane*65;
          if(age<0) continue;
          const t=(age/(850+(i%11)*35))%1;
          const p=point(lane,t,time), tail=point(lane,Math.max(0,t-.018-(i%5)*.004),time);
          const scatter=(1-t)*(6+(i%9)*3);
          const dx=Math.sin(i*13.7)*scatter,dy=Math.cos(i*7.1)*scatter;
          const alpha=Math.sin(t*Math.PI)*intensity;
          ctx.strokeStyle=`rgba(${color},${alpha*.75})`;ctx.lineWidth=i%7===0?1.6:.7;
          ctx.beginPath();ctx.moveTo(tail.x+dx,tail.y+dy);ctx.lineTo(p.x+dx,p.y+dy);ctx.stroke();
          ctx.fillStyle=`rgba(235,255,255,${alpha})`;ctx.beginPath();ctx.arc(p.x+dx,p.y+dy,i%7===0?1.4:.65,0,Math.PI*2);ctx.fill();
        }
        glow(targetX,targetY,20+progress*18,arrived*.35);
      }
      if(release>0) {
        glow(targetX,targetY,width*.55,release*.4);
        const age=1-release;
        for(let i=0;i<64;i++) {
          const angle=i*2.39996, radius=age*width*(.2+(i%7)*.06);
          ctx.fillStyle=`rgba(${color},${release*.6})`;ctx.beginPath();ctx.arc(targetX+Math.cos(angle)*radius,targetY+Math.sin(angle)*radius*.65,1.5,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.globalCompositeOperation="source-over";
    };
    raf=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); host.style.removeProperty("--charge");host.style.removeProperty("--shake"); };
  }, [tone]);

  return <canvas ref={canvas} className="case-energy-canvas" aria-hidden="true" />;
}
