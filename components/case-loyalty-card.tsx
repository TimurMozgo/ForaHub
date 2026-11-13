"use client";
import {useEffect,useState} from 'react';
import {Gift} from 'lucide-react';
import type {loyaltyProgress} from '../lib/case-loyalty';
type Progress=ReturnType<typeof loyaltyProgress>&{paymentsConnected:boolean};
export function CaseLoyaltyCard(){
 const [data,setData]=useState<Progress|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch('/api/cases/loyalty',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error(r.status===401?'Войди в аккаунт, чтобы видеть прогресс.':'Не удалось загрузить прогресс.');return r.json() as Promise<Progress>;}).then(v=>{if(live)setData(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 return <section className="case-loyalty" aria-label="Бонус за оплаченные покупки"><Gift size={27}/><div className="case-loyalty-copy"><span className="eyebrow">БОНУС ЗА ПОКУПКИ</span><h2>NFT за 2500 оплаченных Stars</h2><p>Один бонусный NFT стоимостью до 500 Stars за покупки кейсов. Выигранные и бесплатные Stars не учитываются.</p>{data?<><div className="case-loyalty-numbers"><strong>{data.progress.toLocaleString('ru-RU')} / {data.target.toLocaleString('ru-RU')} Stars</strong><span>{data.status==='awarded'?'Бонус получен':data.status==='earned'?'Бонус заработан':`Осталось ${data.remaining.toLocaleString('ru-RU')}`}</span></div><progress value={data.progress} max={data.target} aria-label="Прогресс оплаченных покупок"/>{data.status==='awarded'&&<p>{data.award?.label}</p>}{data.status==='earned'&&<p>Бонус заработан. Выдача ожидает подключения NFT-инвентаря.</p>}{!data.paymentsConnected&&<small>Учёт начнётся после подключения оплаты. Текущие открытия не засчитываются.</small>}</>:<small role="status">{error||'Загружаем прогресс…'}</small>}</div></section>;
}
