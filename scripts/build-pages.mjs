import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve,extname} from 'node:path';
import {cpSync,mkdirSync,readdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
const root=process.cwd(),out=resolve(root,'out-pages'),base='/ForaHub/';
const rewrite=s=>s.replace(/(["'`(])\/(?!\/|api\/|ForaHub\/)(?=[a-zA-Z])/g,`$1${base}`);
await build({configFile:false,root:resolve(root,'pages'),base,publicDir:false,plugins:[{name:'pages-asset-paths',enforce:'pre',transform(code,id){if(!id.includes('node_modules')&&/\.(tsx|css)$/.test(id))return rewrite(code);}},react()],build:{outDir:out,emptyOutDir:true},css:{postcss:resolve(root,'postcss.config.mjs')}});
cpSync(resolve(root,'public'),out,{recursive:true});
function walk(dir){for(const name of readdirSync(dir)){const p=resolve(dir,name);if(statSync(p).isDirectory())walk(p);else if(['.html','.js','.mjs','.css'].includes(extname(p))&&!p.includes(resolve(out,'assets'))){let s=readFileSync(p,'utf8');s=rewrite(s);if(extname(p)==='.html'&&!s.includes('pages-local.js'))s=s.replace(/<head([^>]*)>/i,`<head$1><script src="${base}pages-local.js"></script>`);if(name==='save-client.mjs')s=s.replaceAll('На устройстве и сервере','Сохранено на устройстве').replaceAll('На устройстве · ожидает синхронизации','Сохранено на устройстве').replaceAll("'synced'","'local'");writeFileSync(p,s);}}}
walk(out);writeFileSync(resolve(out,'pages-local.js'),readFileSync(resolve(root,'pages/local.js')));writeFileSync(resolve(out,'.nojekyll'),'');
console.log('Pages build ready: '+out);

