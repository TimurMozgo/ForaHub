import {readFileSync,writeFileSync} from 'node:fs';
const version=process.argv[2];
if(!version||!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(version))throw new Error('Usage: node scripts/bump-forge-version.mjs YYYY.MM.DD.N');
const root=new URL('../public/games/turret-forge/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('version.json',root),'utf8'));
for(const name of ['index.html','game.js','save-client.mjs']){
 const file=new URL(name,root);writeFileSync(file,readFileSync(file,'utf8').replace(/\?v=[0-9.]+/g,`?v=${version}`));
}
writeFileSync(new URL('version.json',root),JSON.stringify({...manifest,version})+'\n');
console.log(`Turret Forge release ${version}; save format remains ${manifest.saveFormat}.`);
