export type Prize = { id?: string; kind: "star" | "gift" | "gem"; amount?: number; label: string; image?: string; topPrize?: boolean };
export type CaseId = "free" | "spark" | "pulse" | "legend";

const gift = (id: string, label: string, kind: "gift" | "gem" = "gift"): Prize => ({id,label,kind,image:`/cases/prizes/${id}.webp`});
export const GIFTS: Record<string, Prize> = {
  heart:gift("heart","Сердце"),bear:gift("bear","Мишка"),box:gift("box","Подарочная коробка"),rose:gift("rose","Роза"),
  cake:gift("cake","Торт"),flowers:gift("flowers","Букет"),rocket:gift("rocket","Ракета"),champagne:gift("champagne","Шампанское"),
  trophy:gift("trophy","Кубок"),ring:gift("ring","Кольцо"),diamond:gift("diamond","Бриллиант"),
  lollipop:gift("lollipop","Lol Pop","gem"),calendar:gift("calendar","Desk Calendar","gem"),
  jester:gift("jester","Jester Hat","gem"),homemade:gift("homemade","Homemade Cake","gem"),
  candle:gift("candle","B-Day Candle","gem"),sparkler:gift("sparkler","Party Sparkler","gem"),
  cookie:gift("cookie","Ginger Cookie","gem"),candy:gift("candy","Candy Cane","gem"),
  bowtie:gift("bowtie","Bow Tie","gem"),
  evileye:gift("evileye","Evil Eye","gem"),
  lightsword:gift("lightsword","Light Sword","gem"),
  jellybunny:gift("jellybunny","Jelly Bunny","gem"),
  crystalball:gift("crystalball","Crystal Ball","gem"),
  lovepotion:gift("lovepotion","Love Potion","gem"),
  madpumpkin:gift("madpumpkin","Mad Pumpkin","gem"),
  flyingbroom:gift("flyingbroom","Flying Broom","gem"),
  bondedring:gift("bondedring","Bonded Ring","gem"),
  genielamp:gift("genielamp","Genie Lamp","gem"),
  kissedfrog:gift("kissedfrog","Kissed Frog","gem"),
  magicpotion:gift("magicpotion","Magic Potion","gem"),
  redo:{...gift("redo","Redo · Resistance Dog","gem"),topPrize:true},
};

// Preview collections, not a funded prize inventory or a production odds table.
const pools: Record<CaseId,string[]> = {
  free:["heart","bear","box","rose","cake","flowers","rocket","lollipop","calendar","redo"],
  spark:["heart","bear","box","rose","rocket","champagne","trophy","diamond","jester","homemade","redo"],
  pulse:["bear","box","cake","flowers","rocket","ring","diamond","champagne","candle","sparkler","redo"],
  legend:["box","cake","flowers","rocket","trophy","ring","diamond","champagne","cookie","candy","redo"],
};
export function getCasePrizes(id: CaseId): Prize[] { return pools[id].map(key=>GIFTS[key]); }
