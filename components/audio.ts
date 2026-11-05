import { REVEAL_AT } from "./motion";
export function playReveal(context: AudioContext) {
  const start = context.currentTime;
  const master = context.createGain();
  master.gain.value = 0.55;
  master.connect(context.destination);
  const tone = (at: number, frequency: number, duration: number, volume: number, end = frequency) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain); gain.connect(master);
    oscillator.frequency.setValueAtTime(frequency, start + at);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + at + duration);
    gain.gain.setValueAtTime(0, start + at);
    gain.gain.linearRampToValueAtTime(volume, start + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + at + duration);
    oscillator.start(start + at); oscillator.stop(start + at + duration);
  };
  // Low rumble builds first; a filtered noise sweep bridges the held turn.
  tone(0, 42, 1.4, 0.2, 95);
  tone(1.15, 1600, 0.075, 0.12, 220);
  const buffer = context.createBuffer(1, context.sampleRate * 1.3, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const filter = context.createBiquadFilter(); filter.type = "bandpass"; filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(180, start + REVEAL_AT - 1.3);
  filter.frequency.exponentialRampToValueAtTime(4200, start + REVEAL_AT);
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0, start + REVEAL_AT - 1.3);
  noiseGain.gain.linearRampToValueAtTime(0.14, start + REVEAL_AT - 0.15);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + REVEAL_AT);
  noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(master);
  noise.start(start + REVEAL_AT - 1.3); noise.stop(start + REVEAL_AT);
  tone(REVEAL_AT, 100, 0.7, 0.35, 34);
  [261.63, 392, 523.25, 783.99].forEach((f, i) => tone(REVEAL_AT + i * 0.055, f, 2.0, 0.065));
  // Plastic latch closes after the disc is safely clear, then a tiny shimmer.
  tone(5.2, 1250, 0.06, 0.12, 160);
  tone(5.24, 240, 0.10, 0.06, 80);
  tone(5.5, 1568, 0.8, 0.025);
  // Once all scheduled nodes have stopped, detach this run's output.
  noise.onended = () => { window.setTimeout(() => master.disconnect(), 3300); };
}
