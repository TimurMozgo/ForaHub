import version from "../../../../public/games/dead-route/version.json";
export const dynamic="force-dynamic";
export function GET(){return Response.json(version,{headers:{"Cache-Control":"no-store"}});}
