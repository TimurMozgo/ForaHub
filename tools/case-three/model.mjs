import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function createChest(){
 const root=new T.Group();root.name='DailyChest';
 const silver=new T.MeshStandardMaterial({color:0xb2bec9,metalness:.88,roughness:.32});
 const dark=new T.MeshStandardMaterial({color:0x15202b,metalness:.72,roughness:.36});
 const titanium=new T.MeshStandardMaterial({color:0x536575,metalness:.92,roughness:.3});
 const black=new T.MeshStandardMaterial({color:0x080f19,metalness:.55,roughness:.42});
 const glow=new T.MeshStandardMaterial({color:0x5dffff,emissive:0x00dbe8,emissiveIntensity:2.8,metalness:.3,roughness:.2});
 const group=(name,parent=root)=>{const g=new T.Group();g.name=name;parent.add(g);return g;};
 function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.045){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function bolt(parent,x,y,z){const mesh=new T.Mesh(new T.CylinderGeometry(.043,.043,.025,6),silver);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);}
 // Cut-corner armour plates with genuine bevels, rather than rounded cubes.
 function plate(parent,w,h,d,cut,mat,x=0,y=0,z=0,horizontal=false){
  const s=new T.Shape(),points=[[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],[w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]];
  points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});geo.center();
  const mesh=new T.Mesh(geo,mat);if(horizontal)mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 const base=group('base');plate(base,2.62,2.04,.2,.27,silver,0,-.69,0,true);plate(base,2.36,1.8,.1,.22,black,0,-.53,0,true);plate(base,2.15,1.6,.025,.18,glow,0,-.455,0,true);
 for(const side of ['front','back']){
  const p=group(side);p.position.z=side==='front'?.94:-.94;if(side==='back')p.rotation.y=Math.PI;
  plate(p,2.45,1.17,.14,.2,titanium,0,-.01);plate(p,2.2,.96,.15,.17,dark,0,-.01,.065);
  box(p,2.07,.022,.025,glow,0,.49,.13);
  // Reinforced shoulders and foot rails leave the graphite field readable.
  box(p,1.74,.08,.08,silver,0,-.5,.14);box(p,1.8,.075,.08,silver,0,.52,.14);
  for(const x of [-1.02,1.02]){box(p,.075,.64,.08,silver,x,-.02,.14);box(p,.023,.4,.02,glow,x,-.02,.19);}
  for(const x of [-.87,.87])for(const y of [-.36,.34])bolt(p,x,y,.138);
  // A real hexagonal lock, including its back and bevels.
  const collar=new T.Mesh(new T.CylinderGeometry(.29,.29,.13,6),silver);collar.rotation.x=Math.PI/2;collar.position.set(0,.16,.18);p.add(collar);
  const lock=new T.Mesh(new T.CylinderGeometry(.218,.218,.145,6),glow);lock.rotation.x=Math.PI/2;lock.position.copy(collar.position);lock.position.z+=.03;p.add(lock);
  const inset=new T.Mesh(new T.CylinderGeometry(.15,.15,.15,6),dark);inset.rotation.x=Math.PI/2;inset.position.copy(lock.position);inset.position.z+=.025;p.add(inset);
  box(p,.3,.29,.13,silver,0,.51,.12);
  for(const x of [-.56,.56])for(let k=0;k<3;k++)box(p,.15,.016,.013,black,x,-.14+k*.08,.17,.006);
 }
 for(const [name,x,angle]of [['left',-1.2,-Math.PI/2],['right',1.2,Math.PI/2]]){
  const p=group(name);p.position.x=x;p.rotation.y=angle;
  plate(p,1.82,1.17,.14,.16,titanium,0,-.01);plate(p,1.6,.96,.15,.14,dark,0,-.01,.065);box(p,1.5,.022,.03,glow,0,.48,.135);
  for(const a of [-.52,.52]){box(p,.1,.65,.075,silver,a,0,.14);box(p,.035,.44,.02,glow,a,0,.19);}
  for(const a of [-.66,.66])for(const y of [-.36,.35])bolt(p,a,y,.14);
 }
 const lid=group('lid');lid.position.y=.71;
 plate(lid,2.67,2.1,.24,.3,silver,0,0,0,true);plate(lid,2.43,1.86,.16,.26,titanium,0,.16,0,true);
 plate(lid,2.23,1.66,.12,.25,dark,0,.255,0,true);
 plate(lid,2.4,1.85,.018,.25,glow,0,-.145,0,true);
 // Twin reinforced bands and inset top medallion.
 for(const x of [-.89,.89])box(lid,.14,.13,1.74,silver,x,.29);
 const emblem=new T.Mesh(new T.CylinderGeometry(.27,.27,.04,6),titanium);emblem.position.y=.34;lid.add(emblem);
 const gem=new T.Mesh(new T.CylinderGeometry(.19,.19,.045,6),dark);gem.position.y=.36;lid.add(gem);
 box(lid,.15,.014,.035,glow,0,.391,0,.005);
 const core=group('core');
 const sphere=new T.Mesh(new T.IcosahedronGeometry(.27,2),glow);core.add(sphere);
 for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.34,.035,8,36),silver);ring.rotation.set(i*Math.PI/3,i*Math.PI/3,0);core.add(ring);}
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return root;
}
