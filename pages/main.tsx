import React, {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Hub from '../app/page';
import '../app/globals.css';
function App(){
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>window.dispatchEvent(new Event('tinell:ready')));
  return ()=>cancelAnimationFrame(frame);
 },[]);
 return <Hub/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
