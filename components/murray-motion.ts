import { clamp, easeOut, revealAt, smooth } from "./motion.ts";
export const MURRAY_COUNT = 4;
const angles = [-0.35, 2.65, 0.55, 3.45];
export function murrayParticle(time: number, index: number) {
  const age = time - revealAt("murray") - 0.12 - index * 0.13;
  const progress = clamp(age / 2.1);
  const radius = 1.05 + easeOut(progress) * 1.25;
  return {
    visible: age > 0 && age < 2.1,
    x: Math.cos(angles[index]) * radius,
    y: Math.sin(angles[index]) * radius * 0.7 + progress * 0.25,
    rotation: Math.sin(age * 3 + index) * 0.2 + (index % 2 ? -1 : 1) * progress * 0.35,
    size: (0.45 + smooth(progress / 0.15) * 0.3) * (1 - progress * 0.12),
    opacity: smooth(progress / 0.12) * (1 - smooth((progress - 0.5) / 0.5)) * 0.9,
  };
}
