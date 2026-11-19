"use client";
import {useEffect, useRef, type ReactNode} from "react";

export function HomeGamesReveal({children}:{children:ReactNode}) {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const grid=ref.current;
  if(!grid)return;
  let observer:IntersectionObserver|undefined;
  const start=()=>{
   if(observer)return;
   if(!("IntersectionObserver" in window)){
    grid.querySelectorAll(".game-card").forEach(card=>card.classList.add("is-revealed"));
    return;
   }
   observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>
     Number((a.target as HTMLElement).style.getPropertyValue("--card-order"))-Number((b.target as HTMLElement).style.getPropertyValue("--card-order")));
    visible.forEach((entry,index)=>{
     const card=entry.target as HTMLElement;
     card.style.setProperty("--reveal-delay",`${index*140}ms`);
     card.classList.add("is-revealed");
     observer?.unobserve(card);
    });
   },{threshold:.12});
   grid.querySelectorAll(".game-card").forEach(card=>observer!.observe(card));
  };
  window.addEventListener("tinell:entered",start);
  if(!document.getElementById("hub-boot"))start();
  return ()=>{window.removeEventListener("tinell:entered",start);observer?.disconnect()};
 },[]);
 return <div ref={ref} className="games-grid home-games" onFocusCapture={event=>{
  const card=(event.target as HTMLElement).closest(".game-card");
  card?.classList.add("is-revealed");
 }}>{children}</div>;
}
