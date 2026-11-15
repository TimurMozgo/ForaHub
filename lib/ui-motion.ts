// Keep dialogs mounted until their exit finishes; repeated close requests share it.
const exits=new WeakMap<HTMLElement,Promise<void>>();
export function fadeOut(node:HTMLElement|null):Promise<void>{
 if(!node||!node.isConnected)return Promise.resolve();
 const pending=exits.get(node);if(pending)return pending;
 const animation=node.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'});
 const done=animation.finished.catch(()=>{}).then(()=>{animation.cancel();exits.delete(node);});
 exits.set(node,done);return done;
}
