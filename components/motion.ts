export const DURATION = 6.2;
export const REVEAL_AT = 3.35;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const spring = (x: number) => {
  const t = clamp(x);
  // The end blends into the exact resting pose instead of snapping to it.
  return 1 - Math.exp(-7 * t) * Math.cos(10 * t) * (1 - smooth((t - 0.8) / 0.2));
};
export function choreography(time: number) {
  const t = Math.max(0, time);
  const anticipation = Math.sin(clamp(t / 1.2) * Math.PI);
  const impact = t - REVEAL_AT;
  return {
    anticipation,
    charge: smooth(t / 1.1) * (1 - smooth((t - 1.25) / 0.8)),
    shake: (Math.sin(t * 75) + Math.sin(t * 113) * 0.45) * 0.016 * anticipation * smooth(t / 0.45),
    lid: spring((t - 1.15) / 2.0),
    disc: spring((t - 1.95) / 2.1),
    tilt: smooth((t - 2) / 1.3),
    // Slow edge-on anticipation, then a fast turn into the reveal.
    turn: smooth((t - 2.2) / 1.1) * Math.PI * 0.5 + easeOut((t - 3.3) / 0.4) * Math.PI * 1.5,
    camera: smooth((t - 1.0) / 3.7),
    cameraPunch: impact < 0 ? 0 : Math.sin(impact * 28) * Math.exp(-impact * 8) * 0.13,
    flash: impact < 0 ? 0 : Math.exp(-impact * 5),
    rays: impact < 0 ? 0 : Math.exp(-impact * 1.25),
    shockwave: clamp(impact / 1.45),
    foil: smooth((t - 3.65) / 1.35),
  };
}

// Reserve real screen space for the header and controls, not a fixed aspect ratio.
export function framing(width: number, height: number) {
  const top = 110;
  const bottom = width < 700 ? 235 : 245;
  const usableHeight = Math.max(160, height - top - bottom);
  return {
    zoom: Math.min(0.76, usableHeight / (height * 0.8), (width - 64) / (height * 0.62)),
    offsetY: (bottom - top) / 2,
  };
}
