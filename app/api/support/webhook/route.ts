import {env} from 'cloudflare:workers';
import {supportWebhook} from '../../../../lib/support-payments';
export const dynamic='force-dynamic';
export async function POST(request:Request){return supportWebhook(request,env);}
