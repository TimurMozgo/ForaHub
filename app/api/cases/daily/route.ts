import {GET as accountGET} from '../account/route';
import {handleOpen} from '../open/route';
export const dynamic='force-dynamic';
export async function GET(){return accountGET();}
export async function POST(request:Request){return handleOpen(request,0);}
