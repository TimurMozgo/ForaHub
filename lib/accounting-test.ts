export type TestOperation = {id:string;action:'topup'|'open'|'sell'|'adjust';amount?:number;price?:number;prize?:string;opening?:string};
export function validateTestOperation(v:unknown):TestOperation {
 const b=v as TestOperation;
 if(!b||typeof b.id!=='string'||!/^TEST-[a-f0-9-]{36}$/.test(b.id))throw Error('invalid_request');
 if(!['topup','open','sell','adjust'].includes(b.action))throw Error('invalid_request');
 const o:TestOperation={id:b.id,action:b.action};
 if(b.action==='topup'||b.action==='adjust'){
  if(!Number.isSafeInteger(b.amount)||Math.abs(b.amount!)>100000||(b.action==='topup'?b.amount!<10:b.amount===0))throw Error('invalid_amount');
  o.amount=b.amount;
 }
 if(b.action==='open'){
  if(![10,25,50,100].includes(b.price!)||!['star','box','calendar'].includes(b.prize!))throw Error('invalid_scenario');
  o.price=b.price;o.prize=b.prize;
 }
 if(b.action==='sell'){
  if(typeof b.opening!=='string'||!/^TEST-[a-f0-9-]{36}$/.test(b.opening))throw Error('invalid_opening');o.opening=b.opening;
 }
 return o;
}
