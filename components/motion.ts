export const DURATION = 6.8;
export const REVEAL_AT = 3.65;
export type RevealVariant = "treasure" | "murray" | "cursed" | "crypt" | "gold";
export const revealAt = (variant: RevealVariant) => variant === "crypt" ? 3.8 : variant === "cursed" ? 2.95 : variant === "murray" ? 3.8 : REVEAL_AT;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const spring = (x: number) => {
  const t = clamp(x);
  // The end blends into the exact resting pose instead of snapping to it.
  return 1 - Math.exp(-7 * t) * Math.cos(10 * t) * (1 - smooth((t - 0.8) / 0.2));
};
export function choreography(time: number, variant: RevealVariant = "treasure") {
  const t = Math.max(0, time);
  const cursed = variant === "cursed";
  const crypt = variant === "crypt";
  const anticipation = Math.sin(clamp(t / (cursed ? 1.8 : 1.2)) * Math.PI);
  const impact = t - revealAt(variant);
  const haunted = variant === "murray";

  const close = smooth((t - 4.35) / 0.85);
  const rebound = Math.sin(clamp((t - 5.2) / 0.42) * Math.PI) * 0.045;
  return {
    anticipation,
    caseYaw: 0,
    levitation: haunted ? Math.sin(clamp((t - 0.4) / 4.8) * Math.PI) ** 2 * 0.32 : 0,
    discX: 0,
    discZ: 0,
    charge: crypt ? smooth(t / 1.8) * (1 - smooth((t - 3) / 1.2)) : cursed ? smooth(t / 1.6) * (1 - smooth((t - 1.8) / .65)) : smooth(t / 1.1) * (1 - smooth((t - 1.25) / 0.8)),
    shake: crypt || cursed || haunted ? 0 : (Math.sin(t * 75) + Math.sin(t * 113) * 0.45) * 0.016 * anticipation * smooth(t / 0.45),
    lid: (crypt ? smooth((t - 1.3) / 1.2) : cursed ? spring((t - 1.65) / .8) : spring((t - 1.15) / 2.0)) * (1 - close) + rebound,
    presentation: smooth((t - 4.4) / 1.7),
    tension: smooth((t - 2.65) / 0.3) * (1 - smooth((t - 3.2) / 0.45)),
    disc: crypt ? smooth((t - 2.55) / 1.25) : cursed ? easeOut((t - 2.25) / .7) : haunted ? .6 * smooth((t - 1.95) / .85) + .4 * smooth((t - 3.1) / .7) : spring((t - 1.95) / 2.1),
    // Maldito first lifts flat out of the tray; camera-facing rotation owns its tilt.
    tilt: cursed || crypt ? 0 : smooth((t - 2) / 1.3),
    cameraFacing: crypt ? smooth((t - 3.15) / .45) : cursed ? smooth((t - 2.45) / .35) : smooth((t - 2.05) / 0.75),
    // Slow edge-on anticipation, then a fast turn into the reveal.
    turn: crypt || haunted || cursed ? 0 : smooth((t - 2.1) / 0.75) * Math.PI * 0.5 + easeOut((t - 3.2) / 0.45) * Math.PI * 1.5,
    camera: smooth((t - 1.0) / 3.7),
    cameraPunch: impact < 0 || haunted || crypt ? 0 : Math.sin(impact * 28) * Math.exp(-impact * 8) * 0.24,
    flash: impact < 0 || crypt ? 0 : Math.exp(-impact * 4),
    rays: impact < 0 ? 0 : Math.exp(-impact * (cursed ? 3 : 0.95)) * (1 - smooth((t - 6) / 0.8)),
    shockwave: clamp(impact / 1.45),
    foil: t < 5.3 ? smooth((t - 3.85) / 1.1) : smooth((t - 5.3) / 1.2),
  };
}

// Reserve real screen space for the header and controls, not a fixed aspect ratio.
export function framing(width: number, height: number) {
  const top = 110;
  const bottom = 80;
  const usableHeight = Math.max(160, height - top - bottom);
  return {
    zoom: Math.min(1.2, usableHeight / (height * 0.65), (width - 48) / (height * 0.62)),
    offsetY: (bottom - top) / 2,
  };
}

// Keep the margin continuous when the projected bounds cross the fit threshold.
// Recover toward a closer framing slowly; never ease past the safe zoom.
export function fittedZoom(base: number, correction: number, previous: number | null, delta: number) {
  const safe = base * 0.97 * Math.min(1, correction);
  if (previous === null) return safe;
  const follow = 1 - Math.exp(-Math.max(0, delta) * 4);
  return Math.min(safe, previous + (safe - previous) * follow);
}

// Light arrives before the lid opens; mist clears as the final framing settles.
export function cryptAtmosphere(time: number, reduced = false) {
  const t = Math.max(0, time);
  const clear = smooth((t - 3.7) / 2.2);
  const focus = smooth((t - 3.8) / 2.3);
  const light = smooth((t - .1) / 1.1);
  return {
    clear,
    focus,
    light,
    track: smooth((t - 2.55) / 1.25),
    fog: reduced ? 0 : .22 * (1 - clear),
    beam: reduced ? .07 : light * (.32 - focus * .24),
  };
}

// One material-only accent. No changes to the treasure choreography.
export function goldFinish(time: number, reduced = false) {
  const sweep = smooth((time - 4.05) / 1.5);
  return {
    sweep: -1.6 + sweep * 3.2,
    reveal: reduced ? 0 : smooth((time - 3.95) / .3) * (1 - smooth((time - 5.45) / .4)),
    rim: reduced ? 0 : smooth((time - 2) / .8) * (1 - smooth((time - 5.6) / .5)),
  };
}
