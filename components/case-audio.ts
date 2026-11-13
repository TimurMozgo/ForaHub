// Original procedural sound design; no downloaded samples or runtime requests.
export class CaseAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private bus:GainNode|null=null;
 private sources=new Set<AudioScheduledSourceNode>();
 private muted=false;
 unlock(){
  try {
   if(!this.context){
    const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
    if(!Constructor)return;
    const c=this.context=new Constructor();const master=this.master=c.createGain();
    master.gain.value=this.muted?0:.55;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.18;
    master.connect(limiter);limiter.connect(c.destination);this.newBus();
   }
   void this.context.resume().catch(()=>{});
  }catch{/* Audio failure must never block opening. */}
 }
 private newBus(){if(!this.context||!this.master)return;this.bus=this.context.createGain();this.bus.connect(this.master);}
 setMuted(muted:boolean){this.muted=muted;if(this.context&&this.master)this.master.gain.setTargetAtTime(muted?0:.55,this.context.currentTime,.025);}
 private track(source:AudioScheduledSourceNode,tail:number){this.sources.add(source);source.onended=()=>{source.disconnect();this.sources.delete(source);};source.stop(tail);}
 private tone(frequency:number,endFrequency:number,at:number,duration:number,volume:number,type:OscillatorType='sine'){
  const c=this.context!;const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type=type;
  oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(this.bus!);oscillator.start(at);this.track(oscillator,at+duration+.05);
 }
 private noise(at:number,duration:number,volume:number,rising=false){
  const c=this.context!,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;
  filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(rising?180:2100,at);filter.frequency.exponentialRampToValueAtTime(rising?1800:220,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+(rising?duration*.85:.012));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.bus!);source.start(at);this.track(source,at+duration+.05);
 }
 cue(cue:string,index=0){
  if(cue==='stop'){this.stop();return;}
  if(cue==='pause'){void this.context?.suspend().catch(()=>{});return;}
  if(cue==='resume'){void this.context?.resume().catch(()=>{});return;}
  const c=this.context;if(!c||c.state!=='running')return;
  const now=c.currentTime+.015,pitch=[1,.89,.75,1,.89][index]??1;
  if(cue==='charge'){
   this.stop();
   // Warm motor harmonics rise in both pitch and loudness, then release before burst.
   for(const [base,level] of [[65,.13],[130,.065],[195,.025]]){
    const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='sine';
    oscillator.frequency.setValueAtTime(base*pitch,now);oscillator.frequency.exponentialRampToValueAtTime(base*2.4*pitch,now+2.8);oscillator.frequency.exponentialRampToValueAtTime(base*1.5*pitch,now+4.1);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level*.25,now+.35);gain.gain.exponentialRampToValueAtTime(level,now+2.8);gain.gain.linearRampToValueAtTime(level*.8,now+3.8);gain.gain.exponentialRampToValueAtTime(.0001,now+4.15);
    oscillator.connect(gain);gain.connect(this.bus!);oscillator.start(now);this.track(oscillator,now+4.2);
   }
   this.noise(now,4.12,.11,true);
  }else if(cue==='burst'){
   this.stop();this.tone(150*pitch,38,now,.8,.65);this.noise(now,.85,.45);
   this.tone(780*pitch,210*pitch,now,.65,.12,'triangle');this.tone(1170*pitch,390*pitch,now+.025,.95,.06);
  }else if(cue==='prize'){
   // Ascending major chord and a soft, shimmering tail.
   [523.25,659.25,783.99,1046.5].forEach((note,i)=>{
    const at=now+i*.09;this.tone(note,note,at,1.45,.14);
    this.tone(note*2.002,note*2,at,1.05,.025);
    this.tone(note,note,at+.22,1.65,.028);
   });
  }
 }
 stop(){
  for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();
  this.bus?.disconnect();this.newBus();
 }
 dispose(){this.stop();void this.context?.close().catch(()=>{});this.context=null;this.bus=null;this.master=null;}
}
