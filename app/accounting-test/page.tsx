import {getChatGPTUser} from '../chatgpt-auth';
import {OWNER_CREDIT_USER} from '../../lib/case-owner-credit';
import TestAccounting from '../../components/test-accounting';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();if(!user||user.userId!==OWNER_CREDIT_USER)return <main style={{padding:32}}>Этот раздел доступен владельцу хаба. <a href="/">Вернуться</a></main>;return <TestAccounting/>;}
