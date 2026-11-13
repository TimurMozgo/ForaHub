"use client";
import {useState} from "react";
import {ArrowRight,Check,Gamepad2,Plus} from "lucide-react";

type Game={id:string;name:string;category:string;tag:string;art:string;description:string};
const details:Record<string,{label:string;lead:string;features:string[];save:string;extra?:string}>={
  patrol:{label:"СКОРО В ХАБЕ · ЭКШЕН",lead:"Возглавь патруль из трёх полицейских: отвечай на вызовы, преследуй нарушителей и возвращай порядок на улицы.",features:["Погони","Команда из трёх","Новые автомобили"],save:"Игра готовится к запуску."},
  dead:{label:"ФЛАГМАН ХАБА · ВЫЖИВАНИЕ",lead:"Собери команду и пробейся к эвакуации через город, захваченный заражёнными.",features:["Главы I–III","Контрольные точки","Наушники 🎧"],save:"Прогресс сохраняется автоматически",extra:"История начинается с главы I. Отряд и снаряжение переходят в следующие главы. При возвращении локация начинается с контрольной точки."},
  cats:{label:"ОБОРОНА ГОРОДА · СТРАТЕГИЯ",lead:"Защити три линии от зомби-собак и проведи отряд котов через пять локаций.",features:["5 локаций","Боссы","Свой отряд"],save:"Уровень, отряд, монеты и очки сохраняются. Незавершённый бой начинается заново."},
  sushi:{label:"УЮТНЫЙ СИМУЛЯТОР",lead:"Построй сеть суши-ресторанов: обслуживай гостей, улучшай кафе и открывай этажи.",features:["Своя сеть кафе","Час пик","Офлайн-доход"],save:"Кафе и улучшения сохраняются. Офлайн-выручка накапливается до 8 или 12 часов."},
  turret:{label:"ОБОРОНА БАЗЫ · СТРАТЕГИЯ",lead:"Собирай турели, объединяй одинаковые установки и продержись как можно дольше.",features:["Волны врагов","Улучшения","Рекорд"],save:"Прогресс сохраняется автоматически. Текущая волна при возвращении начинается заново."},
};

export function GameDetail({game,onLaunch,wishlisted,onWishlist}:{game:Game;onLaunch?:()=>void;wishlisted:boolean;onWishlist:()=>void}){
  const [expanded,setExpanded]=useState(false),info=details[game.id];
  const lead=info?.lead||game.description;
  return <div className="game-detail compact-detail">
    <div className="game-detail-scroll">
      <div className="game-detail-head"><div className={`detail-art game-detail-cover ${game.art}`} role="img" aria-label={`Обложка ${game.name}`}/><div className="game-detail-identity"><span className="eyebrow">{info?.label||`${game.category} · СКОРО В ХАБЕ`}</span><h3>{game.name}</h3><p>{game.tag}</p><span className="game-detail-category">{game.category}</span></div></div>
      <p className="game-detail-lead">{lead}</p>
      {info?.features&&<div className="game-detail-features">{info.features.map(f=><span key={f}>{f}</span>)}</div>}
      <button className="game-detail-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><span>Описание и детали</span><span>{expanded?"Свернуть ↑":"Подробнее ↓"}</span></button>
      {expanded&&<div className="game-detail-expanded">{game.description.split("\n\n").map((p,i)=><p key={i}>{p}</p>)}{info?.extra&&<p className="game-detail-extra">{info.extra}</p>}</div>}
    </div>
    <div className="game-detail-footer">{onLaunch?<button className="gold-button full" onClick={onLaunch}><Gamepad2 size={18}/> Играть внутри хаба <ArrowRight size={17}/></button>:<button className="gold-button full" onClick={onWishlist}>{wishlisted?<><Check size={18}/> В списке ожидания</>:<><Plus size={18}/> Добавить в список ожидания</>}</button>}<p>{info?.save||"Игра готовится к запуску. Мы сообщим, когда она появится в хабе."}</p></div>
  </div>;
}
