import {env} from 'cloudflare:workers';
import {supportInvoice} from '../../../../lib/support-payments';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'invalid_origin'},{status:403});
 return supportInvoice(request,env);
}
