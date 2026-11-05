import test from "node:test";
import assert from "node:assert/strict";
import { choreography, DURATION, REVEAL_AT } from "../components/motion.ts";
test("closed pose has no shake, reveal effects or motion", () => {
  const p = choreography(0);
  for (const key of ["lid", "disc", "shake", "flash", "rays", "camera", "tilt", "turn"] as const) assert.equal(p[key], 0, key);
});
test("anticipation precedes lid; disc waits for lid clearance", () => {
  assert.ok(choreography(0.6).anticipation > 0.9);
  assert.equal(choreography(1).lid, 0);
  assert.equal(choreography(1.9).disc, 0);
  assert.ok(choreography(1.95).lid > 0.9);
});
test("reveal flash and shockwave start at impact, not before", () => {
  assert.equal(choreography(REVEAL_AT - 0.001).flash, 0);
  assert.equal(choreography(REVEAL_AT).flash, 1);
  assert.ok(choreography(REVEAL_AT + 0.5).shockwave > 0);
});
test("motion overshoots then settles to exact final pose", () => {
  assert.ok(choreography(2.45).disc > 1);
  const p = choreography(DURATION);
  assert.equal(p.disc, 1); assert.equal(p.lid, 1);
  assert.equal(p.turn, Math.PI * 2); assert.equal(p.tilt, 1);
  assert.equal(p.foil, 1);
});
test("all outputs remain finite across the complete timeline", () => {
  for (let t = 0; t <= DURATION; t += 1 / 120)
    for (const value of Object.values(choreography(t))) assert.ok(Number.isFinite(value));
});

test("framing reserves room for controls on desktop, mobile and short screens", async () => {
  const { framing } = await import("../components/motion.ts");
  for (const [w, h] of [[1440,960], [1366,768], [390,844], [320,720], [1024,720]]) {
    const f = framing(w, h);
    assert.ok(f.zoom > 0 && f.zoom <= 0.76);
    assert.ok(h * 0.8 * f.zoom <= h - 110 - (w < 700 ? 235 : 245) + 0.01);
    assert.ok(h * 0.52 * f.zoom <= w - 40 + 0.01);
  }
});
