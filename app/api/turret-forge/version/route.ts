import version from "../../../../public/games/turret-forge/version.json";
export const dynamic="force-dynamic";
export function GET(){return Response.json(version,{headers:{"Cache-Control":"no-store"}});}
