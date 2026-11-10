// Procedural audio follows the animation instead of looping unrelated samples.
type Track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => void;
const noiseCache = new WeakMap<AudioContext, AudioBuffer>();
function noise(ctx: AudioContext) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    noiseCache.set(ctx,buffer);
  }
  return buffer;
}

export function sparkFlight(ctx: AudioContext, output: AudioNode, track: Track, index: number) {
  const at=ctx.currentTime, length=.85+(index%3)*.06;
  const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain(), pan=ctx.createStereoPanner();
  source.buffer=noise(ctx); source.loop=true;
  filter.type="bandpass";filter.Q.value=1.5;
  filter.frequency.setValueAtTime(1100+(index%4)*120,at);
  filter.frequency.exponentialRampToValueAtTime(3800,at+length*.65);
  filter.frequency.exponentialRampToValueAtTime(950,at+length);
  pan.pan.setValueAtTime(index%2?.65:-.65,at);pan.pan.linearRampToValueAtTime(0,at+length);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045+Math.min(index,10)*.002,at+.2);
  gain.gain.linearRampToValueAtTime(.1,at+length*.75);gain.gain.linearRampToValueAtTime(0,at+length);
  source.connect(filter).connect(gain).connect(pan).connect(output);
  track(source,[filter,gain,pan]);source.start(at);source.stop(at+length);
}

export function risingHum(ctx: AudioContext, output: AudioNode, track: Track) {
  const at=ctx.currentTime;
  [82.41,164.81,247.22].forEach((hz,i)=>{
    const source=ctx.createOscillator(),gain=ctx.createGain();source.type="sine";
    source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(hz*1.5,at+5.15);
    source.frequency.exponentialRampToValueAtTime(hz*.85,at+6.1);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.009/(i+1),at+.45);
    gain.gain.exponentialRampToValueAtTime(.075/(i+1),at+5.05);
    gain.gain.linearRampToValueAtTime(.012/(i+1),at+5.65);gain.gain.linearRampToValueAtTime(0,at+6.9);
    source.connect(gain).connect(output);track(source,[gain]);source.start(at);source.stop(at+6.92);
  });
}

export function unsealSound(ctx: AudioContext, output: AudioNode, track: Track) {
  const at=ctx.currentTime,source=ctx.createOscillator(),gain=ctx.createGain();
  source.type="sine";source.frequency.setValueAtTime(170,at);source.frequency.exponentialRampToValueAtTime(55,at+.65);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.13,at+.035);gain.gain.exponentialRampToValueAtTime(.001,at+.7);
  source.connect(gain).connect(output);track(source,[gain]);source.start(at);source.stop(at+.72);
}

export function prizeChime(ctx: AudioContext, output: AudioNode, track: Track) {
  // A warm major/add9 chord with quieter overtones and a natural decaying tail.
  const at=ctx.currentTime;
  [440,554.365,659.255,987.767].forEach((hz,i)=>{
    [1,2.001].forEach((harmonic,j)=>{
      const source=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
      const start=at+i*.065;source.type="sine";source.frequency.value=hz*harmonic;pan.pan.value=(i-1.5)*.18;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime((j?.012:.065)/(1+i*.15),start+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,start+1.65);gain.gain.linearRampToValueAtTime(0,start+1.8);
      source.connect(gain).connect(pan).connect(output);track(source,[gain,pan]);source.start(start);source.stop(start+1.81);
    });
  });
}
