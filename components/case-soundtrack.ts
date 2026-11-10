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
    source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(hz*1.5,at+14.15);
    source.frequency.exponentialRampToValueAtTime(hz*.85,at+15.1);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.009/(i+1),at+.45);
    gain.gain.exponentialRampToValueAtTime(.12/(i+1),at+14.05);
    gain.gain.linearRampToValueAtTime(.012/(i+1),at+14.65);gain.gain.linearRampToValueAtTime(0,at+15.9);
    source.connect(gain).connect(output);track(source,[gain]);source.start(at);source.stop(at+15.92);
  });
}

export function unsealSound(ctx: AudioContext, output: AudioNode, track: Track) {
  const at=ctx.currentTime,source=ctx.createOscillator(),gain=ctx.createGain();
  source.type="sine";source.frequency.setValueAtTime(170,at);source.frequency.exponentialRampToValueAtTime(55,at+.65);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.13,at+.035);gain.gain.exponentialRampToValueAtTime(.001,at+.7);
  source.connect(gain).connect(output);track(source,[gain]);source.start(at);source.stop(at+.72);
}

export function prizeChime(ctx: AudioContext, output: AudioNode, track: Track, kind: "star" | "gift" | "gem") {
  // Distinct timbres, not simply increasing loudness. All tails fit the reveal.
  const at=ctx.currentTime;
  const notes=kind==="star"?[880,1318.51]:kind==="gift"?[659.255,830.609,987.767,1318.51]:[220,440,554.365,659.255,880,1318.51];
  const decay=kind==="star"?.42:kind==="gift"?.95:1.48;
  const spacing=kind==="star"?.075:kind==="gift"?.085:.065;
  notes.forEach((hz,i)=>{
    (kind==="star"?[1]:[1,2.001]).forEach((harmonic,j)=>{
      const source=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
      const start=at+i*spacing;source.type="sine";source.frequency.value=hz*harmonic;
      pan.pan.value=(i/(notes.length-1)-.5)*(kind==="gem"?1.2:.5);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime((j?.009:kind==="gem"?.045:.06)/(1+i*.12),start+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,start+decay);gain.gain.linearRampToValueAtTime(0,start+decay+.12);
      source.connect(gain).connect(pan).connect(output);track(source,[gain,pan]);source.start(start);source.stop(start+decay+.13);
    });
  });
  if(kind==="gem") {
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noise(ctx);source.loop=true;filter.type="bandpass";filter.Q.value=.8;
    filter.frequency.setValueAtTime(1800,at);filter.frequency.exponentialRampToValueAtTime(5200,at+.75);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045,at+.35);gain.gain.linearRampToValueAtTime(0,at+1.6);
    source.connect(filter).connect(gain).connect(output);track(source,[filter,gain]);source.start(at);source.stop(at+1.62);
  }
}
