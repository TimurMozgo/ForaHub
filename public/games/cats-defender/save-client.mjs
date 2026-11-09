import {validateState,validateLocal,reconcile} from './save-model.mjs?v=2026.11.09.1';
const endpoint='/api/cats-defender/save';
const uid=()=>crypto.randomUUID();
const clone=s=>JSON.parse(JSON.stringify(s));
export async function createCatsSave(game) {
  let key='',scope='',local=null,cloudKnown=false,busy=false,blocked=false,closed=false,localOK=true,timer=null,releaseLock=null;
  const send=(text,kind='local')=>{document.getElementById('saved').textContent=text;parent.postMessage({type:'cats:status',text,kind},location.origin);};
  const gate=document.createElement('div');gate.id='save-gate';gate.className='save-gate';gate.hidden=true;document.body.append(gate);
  function panel(title,text,actions) {
    gate.replaceChildren();gate.hidden=false;
    const card=document.createElement('div');card.className='save-gate-card';
    const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=text;card.append(h,p);
    for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;card.append(b);}gate.append(card);
  }
  function persist() {
    if(!key||!local)return;
    try {localStorage.setItem(key,JSON.stringify(local));localOK=true;}catch {localOK=false;send('Память устройства недоступна','error');}
  }
  function stash() {try{localStorage.setItem(key+':recovery',JSON.stringify(local));}catch{}}
  async function request(method='GET',body) {
    const controller=new AbortController(),t=setTimeout(()=>controller.abort(),8000);
    try {const r=await fetch(endpoint,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal,keepalive:!!body});
      const data=await r.json();if(!data||typeof data!=='object')throw new Error('bad_response');return {status:r.status,data};
    }finally{clearTimeout(t);}
  }
  function accountCheck(data) {
    if(data.scope!==scope){blocked=true;game.pause();panel('Аккаунт изменился','Закрой игру и открой её снова. Сохранение предыдущего игрока не будет отправлено в другой аккаунт.',[]);send('Нужен повторный вход','error');return false;}return true;
  }
  function cloudRecord(data) {
    const r=data.record;
    if(!r)return null;
    if(!validateState(r.state)||!Number.isInteger(r.revision)||r.revision<1||typeof r.mutationId!=='string')throw new Error('bad_save');return r;
  }
  function fromRemote(r) {return {version:2,state:r?.state||game.fresh(),baseRevision:r?.revision||0,dirty:false,mutationId:r?.mutationId||uid(),savedAt:r?.updatedAt||new Date().toISOString()};}
  function showConflict(remote) {
    local.state=validateState(game.capture())||local.state;blocked=true;game.pause();stash();send('Выбери сохранение','conflict');
    const summary=s=>`уровень ${s.stage+1}, ${s.coins} монет`;
    panel('Есть две версии прогресса',`На устройстве: ${summary(local.state)}. На сервере: ${remote?summary(remote.state):'новая игра'}. Обе копии сохранены; выбери, с какой продолжить.`,[
      ['Продолжить с серверной',()=>{stash();local=fromRemote(remote);persist();game.apply(clone(local.state));blocked=false;gate.hidden=true;send('Восстановлено с сервера','synced');game.resume?.();}],
      ['Оставить прогресс устройства',()=>{stash();local={...local,baseRevision:remote?.revision||0,dirty:true,mutationId:uid(),lastAttemptId:undefined};persist();blocked=false;gate.hidden=true;game.resume?.();schedule(0);}],
    ]);
  }
  async function refresh() {
    const {status,data}=await request();
    if(status===401){blocked=true;game.pause();panel('Вход в аккаунт истёк','Сохранение осталось на устройстве. Открой хаб заново после входа.',[]);send('Нужен вход','error');return false;}
    if(!accountCheck(data))return false;
    if(status!==200)throw new Error('offline');
    const remote=cloudRecord(data),decision=reconcile(local,remote);cloudKnown=true;
    if(decision==='conflict'){showConflict(remote);return false;}
    if(decision==='acknowledged'){local={...local,baseRevision:remote.revision,dirty:false};persist();}
    if(decision==='rebase'){local={...local,baseRevision:remote.revision,lastAttemptId:undefined};persist();}
    if(decision==='remote' && remote?.revision!==local?.baseRevision){local=fromRemote(remote);persist();game.pause();game.apply(clone(local.state));}
    return true;
  }
  function schedule(ms=1200) {if(!timer&&!closed)timer=setTimeout(()=>{timer=null;void flush();},ms);}
  async function flush() {
    if(busy||blocked||!local||!local.dirty)return;
    busy=true;
    try {
      if(!cloudKnown && !await refresh())return;
      if(!local.dirty)return;
      const sent=clone(local);local.lastAttemptId=sent.mutationId;persist();
      send('Синхронизация…','syncing');
      const {status,data}=await request('PUT',{formatVersion:2,state:sent.state,baseRevision:sent.baseRevision,mutationId:sent.mutationId});
      if(status===401){cloudKnown=false;throw new Error('auth');}
      if(!accountCheck(data))return;
      if(status===426){blocked=true;game.pause();panel('Доступно обновление','Вернись в хаб и открой игру снова. Текущий прогресс сохранён локально.',[]);send('Нужно обновить игру','error');return;}
      if(status===409){showConflict(cloudRecord(data));return;}
      if(status!==200)throw new Error('offline');
      const remote=cloudRecord(data);if(!remote||remote.mutationId!==sent.mutationId)throw new Error('bad_ack');
      local={...local,baseRevision:remote.revision,dirty:local.mutationId!==sent.mutationId,lastAttemptId:undefined};persist();
      send(local.dirty?'На устройстве · синхронизация…':localOK?'На устройстве и сервере':'На сервере · локальная память недоступна',local.dirty?'local':'synced');
    }catch {cloudKnown=false;send(localOK?'На устройстве · сервер недоступен':'Сохранение не подтверждено','error');}
    finally{busy=false;if(local?.dirty&&!blocked)schedule(6000);}
  }
  function write(state) {
    if(!local||blocked||closed)return;
    const valid=validateState(state);if(!valid){send('Ошибка формата сохранения','error');return;}
    if(JSON.stringify(valid)===JSON.stringify(local.state)){if(local.dirty)schedule();return;}
    local={...local,state:valid,dirty:true,mutationId:uid(),savedAt:new Date().toISOString()};persist();send(localOK?'Сохранено на устройстве':'Локальная память недоступна',localOK?'local':'error');schedule();
  }
  async function init() {
    try {
      const {status,data}=await request();
      if(!data.scope || ![200,503].includes(status))throw new Error(status===401?'sign_in':'network');
      scope=data.scope;key=`gamehub:cats-defender:v2:${scope}`;
      if(navigator.locks){const acquired=await new Promise(resolve=>{navigator.locks.request(key,{ifAvailable:true},lock=>{if(!lock){resolve(false);return;}resolve(true);return new Promise(r=>{releaseLock=r;});}).catch(()=>resolve(false));});
        if(!acquired){panel('Игра уже открыта','Закрой CatsDefender в другой вкладке, затем попробуй снова.',[['Проверить снова',()=>location.reload()]]);send('Открыто в другой вкладке','error');return;}}
      let raw;try{raw=localStorage.getItem(key);local=validateLocal(JSON.parse(raw||'null'));if(raw&&!local)localStorage.setItem(key+':damaged',raw);}catch{localOK=false;}
      if(status===200&&data.formatVersion!==2)throw new Error('format');
      if(status===200){cloudKnown=true;const remote=cloudRecord(data),decision=reconcile(local,remote);
        if(decision==='conflict'){game.apply(clone(local.state));game.ready();showConflict(remote);return;}
        if(decision==='remote')local=fromRemote(remote);
        if(decision==='acknowledged')local={...local,baseRevision:remote.revision,dirty:false};
        if(decision==='rebase')local={...local,baseRevision:remote.revision,lastAttemptId:undefined};
      }else if(!local)throw new Error('network');
      persist();game.apply(clone(local.state));game.ready();send(status===200&&!local.dirty?'На устройстве и сервере':'На устройстве · ожидает синхронизации',status===200&&!local.dirty?'synced':'local');
      // First visit creates an explicit cloud checkpoint even before the first purchase.
      if(!local.baseRevision&&!local.dirty){local.dirty=true;persist();}
      if(local.dirty)schedule(0);
    }catch(e){panel('Не удалось открыть сохранение',e.message==='sign_in'?'Для персонального прогресса нужен вход в хаб.':'Проверь соединение и попробуй снова. Мы не начинаем новую игру поверх существующего сохранения.',[['Повторить',()=>location.reload()]]);send('Сохранение ещё не загружено','error');}
  }
  window.addEventListener('online',()=>{cloudKnown=false;void flush();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){game.pause();write(game.capture());void flush();}});
  window.addEventListener('pagehide',()=>{write(game.capture());void flush();});
  window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent)return;
    if(e.data?.type==='cats:exit'){game.pause();write(game.capture());await Promise.race([flush(),new Promise(r=>setTimeout(r,1400))]);closed=true;if(timer)clearTimeout(timer);releaseLock?.();parent.postMessage({type:'cats:exit-ready'},location.origin);}
  });
  await init();
  return {write,flush};
}



