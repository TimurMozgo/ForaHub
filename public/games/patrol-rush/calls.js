'use strict';

const calls = [
 {title:'Хулиганство', area:'Жилой квартал', brief:'Жалоба на шумного мужчину у дома. Проверьте, что происходит, и поговорите с ним.'},
 {title:'Ссора во дворе', area:'Двор у жилых домов', brief:'Двое спорят во дворе. Разведите их и выслушайте каждого.'},
 {title:'Вандализм', area:'Проезд у контейнеров', brief:'Очевидец видел, как кто-то бьёт по мусорному контейнеру. Остановите порчу имущества.'},
 {title:'Подозрительная коробка', area:'Улица у подъезда', brief:'На тротуаре оставили коробку. Осмотрите её и выясните, кому она принадлежит.'},
 {title:'Сообщение о краже', area:'Соседний квартал', brief:'Заявитель говорит, что прохожий забрал коробку. Остановите прохожего и проверьте обе версии.'},
 {title:'Сообщение о выстрелах', area:'Перекрёсток', brief:'Очевидец слышал резкий хлопок. Оцените обстановку с расстояния вместе с отрядом.'},
];

function createCall(index, alternate, api) {
 const {npc, entity, route, followPath, finish, detain, converse} = api;
 const actors = [npc];
 let prop = null;
 let step;
 let fleeing = false;
 let tick = () => {};

 function place(actor, kind, x, y, face = 1) {
  Object.assign(actor, entity(kind, api.yardX+18+(x%24), y), {visible:true, face, pose:null, repathTimer:0});
  return actor;
 }
 function resident(x, y) {
  const actor = entity('resident', api.yardX+18+(x%24), y);
  actor.visible = true;
  actors.push(actor);
  return actor;
 }
 function objective(target, instruction, label, act, range = 40) {
  step = {target, instruction, label, act, range};
 }
 function button(label, act) { return {label, act}; }
 function talk(title, copy, ...options) {
  // The same escort/boarding flow is available for every person on a call.
  // A premature or mistaken detention is recorded honestly in the result.
  if (title !== 'Коробка' && !options.some(option => /отдел/i.test(option.label))) {
   const mistaken = index === 3 || (index === 4 && !alternate) || (index === 5 && alternate);
   const result = mistaken
    ? 'Человек доставлен в отдел до дальнейшего выяснения. На месте оснований для задержания не подтвердилось.'
    : 'Человек доставлен в отдел до дальнейшего выяснения обстоятельств вызова.';
   options.push(button('Забрать в отдел', () => {
    if(index === 5 && !alternate) npc.pose = 'armedSurrender';
    detain(result);
   }));
  }
  options = options.map(option => /отдел/i.test(option.label) ? {...option,label:'Забрать в отдел'} : option);
  converse(title, copy, options);
 }
 function returnToCar(copy, consequence) { finish(copy, consequence); }
 function stopAndChoose() {
  npc.path = [];
  npc.moving = false;
  npc.pose = null;
  fleeing = false;
  talk('Порча имущества', '— Понял. Больше не трону контейнер.',
   button('Предупредить', () => returnToCar('Порча имущества прекращена. Нарушитель получил предупреждение.')),
   button('Доставить в отдел', () => detain('Нарушитель доставлен в отдел для выяснения обстоятельств порчи имущества.')));
 }
 function startChase(onCatch, x, y) {
  fleeing = true;
  npc.path = route(npc, api.yardX+24, y);
  objective(npc, 'ДОГОНИ И ОСТАНОВИ', 'ОСТАНОВИТЬ', onCatch, 26);
 }

 switch (index) {
  case 1: {
   place(npc, 'resident', 194, 218, 1);
   const other = resident(232, 218);
   other.face = -1;
   function hearOther() {
    talk('Второй участник', '— Он преградил мне дорогу и первым начал кричать. Я тоже вспылил.',
     button('Предложить разойтись', () => returnToCar('Обе стороны выслушаны. Участники согласились разойтись.')),
     button('Забрать второго в отдел до выяснения', () => {
      const first={x:npc.x,y:npc.y};
      npc.x=other.x;npc.y=other.y;other.x=first.x;other.y=first.y;
      detain('Второй участник доставлен в отдел до дальнейшего выяснения обстоятельств ссоры.');
     }));
   }
   function hearCaller() {
    talk('Заявитель', '— Я вызвал вас. Мы поспорили, и он повысил голос.',
     button('Выслушать второго', () => objective(other, 'ВЫСЛУШАЙ ВТОРОГО УЧАСТНИКА', 'ГОВОРИТЬ', hearOther, 30)));
   }
   objective(npc, 'РАЗНИМИ УЧАСТНИКОВ', 'РАЗНЯТЬ', () => {
    npc.face = -1;
    other.face = 1;
    objective(npc, 'ВЫСЛУШАЙ ЗАЯВИТЕЛЯ', 'ГОВОРИТЬ', hearCaller, 30);
   });
   break;
  }
  case 2:
   place(npc, 'npc', 232, 365);
   npc.pose = 'npcStrike';
   objective(npc, 'ОСТАНОВИ ПОРЧУ ИМУЩЕСТВА', 'ОКЛИКНУТЬ', () => {
    npc.pose = null;
    if (alternate) stopAndChoose();
    else startChase(stopAndChoose, 114, 240);
   }, 55);
   break;
  case 3: {
   place(npc, 'resident', 226, 295);
   prop = {key:'object12', x:api.yardX+35, y:371, w:12, h:12};
   const box = {x:api.yardX+41, y:378};
   function askOwner() {
    talk('Владелец коробки', '— Это моя доставка. На ярлыке указан мой адрес. Я поставил её здесь, пока открывал дверь.',
     button('Сверить ярлык и вернуть', () => {
      prop = null;
      returnToCar('Адрес совпал с ярлыком. Владелец забрал коробку, угрозы нет.');
     }));
   }
   objective(box, 'ОСМОТРИ КОРОБКУ', 'ОСМОТРЕТЬ', () => {
    talk('Коробка', 'На коробке сохранился ярлык доставки с адресом этого дома.',
     button('Уточнить у жильца', () => objective(npc, 'НАЙДИ ВЛАДЕЛЬЦА', 'ГОВОРИТЬ', askOwner)));
   }, 30);
   break;
  }
  case 4: {
   place(npc, 'npc', 273, 356);
   const claimant = resident(267, 411);
   function checkClaim() {
    const copy = alternate
     ? '— Вот мой заказ. Имя и номер на ярлыке совпадают. Коробку действительно забрали без спроса.'
     : '— Я перепутал коробки. Номер на ярлыке совпадает с его заказом. Извините.';
    const options = alternate
     ? [button('Вернуть коробку и предупредить', () => {
        prop = null;
        returnToCar('Владелец подтверждён по ярлыку. Коробку вернули, нарушителя предупредили.');
       }),
        button('Вернуть и доставить в отдел', () => {
         prop = null;
         detain('Коробку вернули владельцу. Нарушитель доставлен в отдел для выяснения обстоятельств.');
        })]
     : [button('Отпустить прохожего', () => {
        prop = null;
        returnToCar('Обвинение не подтвердилось. Коробка принадлежала прохожему.');
       })];
    talk('Проверка заявления', copy, ...options);
   }
   function stopRunner() {
    npc.path = [];
    npc.moving = false;
    fleeing = false;
    prop = {key:'object12', x:npc.x+9, y:npc.y-8, w:12, h:12};
    talk('Прохожий', '— Вот ярлык на коробке. Сравните номер с заказом заявителя.',
     button('Проверить у заявителя', () => objective(claimant, 'СВЕРЬ ВЕРСИЮ ЗАЯВИТЕЛЯ', 'ПРОВЕРИТЬ', checkClaim)));
   }
   let started = false;
   const begin = () => {
    if (started) return;
    started = true;
    startChase(stopRunner, 110, 231);
   };
   objective(npc, 'НАЙДИ ПРОХОЖЕГО', 'ПОДОЙТИ', begin);
   tick = player => { if (!started && api.distance(player, npc) < 85) begin(); };
   break;
  }
  case 5: {
   place(npc, alternate ? 'resident' : 'armed', 275, 318, -1);
   function assess() {
    if (alternate) {
     talk('Очевидец', '— Хлопнула металлическая крышка контейнера. Я подумал, что стреляли. Оружия я не видел.',
      button('Закрыть ложную тревогу', () => returnToCar('Очевидец подтвердил источник хлопка. Выстрелов не было.')));
     return;
    }
    talk('Оружие в руках', 'Человек видит отряд и отвечает. С ним можно говорить с расстояния.',
     button('Попросить опустить оружие', () => {
      npc.pose = 'armedSurrender';
      objective(npc, 'ПОДТВЕРДИ СДАЧУ', 'ГОВОРИТЬ', () => {
       talk('Мирная сдача', '— Я опустил оружие. Сдаюсь. Дальше сопротивляться не буду.',
        button('Отпустить', () => returnToCar('Позже поступило сообщение: освобождённый вооружённый человек убил человека.', {release:true,dead:1})),
        button('Забрать в отдел', () => detain('Вооружённый человек сдался и доставлен в отдел без стрельбы.')));
      }, 55);
     }));
   }
   objective(npc, 'ОЦЕНИ ОБСТАНОВКУ С РАССТОЯНИЯ', 'ОЦЕНИТЬ', assess, 94);
   break;
  }
 }

 return {
  actors,
  get prop() { return prop; },
  get step() { return step; },
  update(player, dt) {
   tick(player);
   for (const actor of actors) followPath(actor, dt, actor === npc && fleeing ? 65 : 60);
  },
 };
}
