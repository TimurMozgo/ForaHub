import {copyFile} from 'node:fs/promises';
for(const name of ['index.html','app.bundle.js','daily-chest.glb'])await copyFile(new URL(name,import.meta.url),new URL('../../public/cases/three/'+name,import.meta.url));
console.log('Updated /cases/three assets');
