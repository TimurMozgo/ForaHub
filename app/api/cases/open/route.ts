import {casesAvailable} from '../../../../lib/launch-features';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {settleCaseOpening} from '../../../../lib/case-account-server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function handleOpen(request:Request,fixedCase?:number){
 if(!casesAvailable()) return Response.json({error:"coming_soon"},{status:503,headers:{"Cache-Control":"no-store"}});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'invalid_origin'},{status:403,headers});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'sign_in_required'},{status:401,headers});
 let requestId:string,caseIndex:number;
 try{const b=await request.json() as {requestId:string;caseIndex:number};requestId=b.requestId;caseIndex=fixedCase??b.caseIndex;if(typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)||!Number.isInteger(caseIndex)||caseIndex<0||caseIndex>4)throw Error();}catch{return Response.json({error:'invalid_request'},{status:400,headers});}
 try{const result=await settleCaseOpening(user.userId,caseIndex,requestId);return Response.json({...result,prize:result.receipt.prize,nextAt:result.account.nextAt,serverNow:result.account.serverNow},{headers});}
 catch(e){const message=e instanceof Error?e.message:'';const known=['cooldown','insufficient_balance','request_conflict','account_capacity','retry'];return Response.json({error:known.includes(message)?message:'unavailable'},{status:known.includes(message)?409:503,headers});}
}
export async function POST(request:Request){return handleOpen(request);}

