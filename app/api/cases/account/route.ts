import {getChatGPTUser} from '../../../chatgpt-auth';
import {readCaseAccount} from '../../../../lib/case-account-server';
import {accountView} from '../../../../lib/case-account';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'sign_in_required'},{status:401,headers});try{const {account,revision}=await readCaseAccount(user.userId);return Response.json(accountView(account,revision),{headers});}catch{return Response.json({error:'unavailable'},{status:503,headers});}}
