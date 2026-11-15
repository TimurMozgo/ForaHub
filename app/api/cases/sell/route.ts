import {casesAvailable} from '../../../../lib/launch-features';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {settleGiftSale} from '../../../../lib/case-account-server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
export async function POST(request:Request){
 if(!casesAvailable()) return Response.json({error:"coming_soon"},{status:503,headers:{"Cache-Control":"no-store"}});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'invalid_origin'},{status:403,headers});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'sign_in_required'},{status:401,headers});
 let body:{requestId:string;prizeId:string;openingId?:string};
 try{body=await request.json();if(!uuid(body.requestId)||typeof body.prizeId!=='string'||!/^[a-z0-9-]{1,50}$/.test(body.prizeId)||(body.openingId!==undefined&&!uuid(body.openingId)))throw Error();}catch{return Response.json({error:'invalid_request'},{status:400,headers});}
 try{return Response.json(await settleGiftSale(user.userId,body.requestId,body.prizeId,body.openingId),{headers});}
 catch(e){const error=e instanceof Error?e.message:'';const known=['gift_unavailable','already_sold','request_conflict','account_capacity','retry'];return Response.json({error:known.includes(error)?error:'unavailable'},{status:known.includes(error)?409:503,headers});}
}

