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
  assert.equal(p.disc, 1); assert.ok(Math.abs(p.lid) < 1e-12);
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
    assert.ok(f.zoom > 0 && f.zoom <= 1.2);
    assert.ok(h * 0.65 * f.zoom <= h - 190 + 0.01);
    assert.ok(h * 0.62 * f.zoom <= w - 48 + 0.01);
  }
});


test("case closes only after disc clearance, with a positive latch rebound", () => {
  assert.ok(choreography(4.3).lid > 0.99);
  assert.ok(choreography(4.3).disc >= 1);
  assert.ok(choreography(4.8).lid < 0.5);
  assert.ok(Math.abs(choreography(5.2).lid) < 1e-12);
  assert.ok(choreography(5.35).lid > 0);
  assert.ok(Math.abs(choreography(DURATION).lid) < 1e-12);
  for(let t = 4.35; t < DURATION; t += .02) assert.ok(choreography(t).lid >= -1e-12);
});

test("disc holds edge-on before the final reveal turn", () => {
  assert.equal(choreography(2.9).turn, Math.PI / 2);
  assert.equal(choreography(3.15).turn, Math.PI / 2);
  assert.ok(Math.abs(choreography(REVEAL_AT).turn - Math.PI * 2) < 1e-12);
});

test("safe camera zoom is continuous at the fit threshold (no 3% snap)", async () => {
  const { fittedZoom } = await import("../components/motion.ts");
  const below = fittedZoom(.76, .999999, null, 1/60);
  const above = fittedZoom(.76, 1.000001, null, 1/60);
  assert.ok(Math.abs(above - below) < .000001);
});
test("camera recovers gradually without exceeding safe bounds", async () => {
  const { fittedZoom } = await import("../components/motion.ts");
  const zoom = fittedZoom(.76, 1, .5, 1/60);
  assert.ok(zoom > .5 && zoom < .52);
  assert.ok(fittedZoom(.76, .6, .7, 1/60) <= .76 * .6 * .97 + 1e-12);
});
test("final pose stays continuous through the interaction handoff", () => {
  const before = choreography(DURATION - .0001);
  const after = choreography(DURATION + .0001);
  for(const key of ["lid","disc","tilt","turn","presentation","camera"] as const)
    assert.ok(Math.abs(before[key] - after[key]) < .000001, key);
});

test("treasure is unchanged; Murray levitates without a lateral orbit", async () => {
  const { revealAt } = await import("../components/motion.ts");
  for (let t = 0; t <= DURATION; t += .1) assert.deepEqual(choreography(t), choreography(t, "treasure"));
  assert.notEqual(revealAt("murray"), revealAt("treasure"));
  assert.equal(choreography(2.5, "treasure").discX, 0);
  assert.equal(choreography(2.5, "murray").discX, 0);
  assert.ok(choreography(2, "murray").levitation > .1);
  const end = choreography(DURATION, "murray");
  for(const key of ["lid", "caseYaw", "levitation", "discX", "discZ"] as const) assert.ok(Math.abs(end[key]) < 1e-10, key);
  assert.equal(end.turn, 0);
});
test("Murray particles stagger, fade, and fully disappear before interaction", async () => {
  const { MURRAY_COUNT, murrayParticle } = await import("../components/murray-motion.ts");
  assert.equal(MURRAY_COUNT, 4);
  for(let i = 0; i < MURRAY_COUNT; i++) {
    assert.equal(murrayParticle(0, i).visible, false);
    assert.equal(murrayParticle(4.6, i).visible, true);
    assert.equal(murrayParticle(DURATION, i).visible, false);
    for(let t = 0; t < DURATION; t += .02) {
      const p = murrayParticle(t, i);
      assert.ok(p.opacity >= 0 && p.opacity <= .9);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.rotation));
    }
  }
  assert.equal(murrayParticle(3.95, 0).visible, true);
  assert.equal(murrayParticle(3.95, 3).visible, false);
});


test("Murray jaw simulates a bounded laugh and rests outside the reveal", async () => {
  const { murrayParticle } = await import("../components/murray-motion.ts");
  assert.equal(murrayParticle(0, 0).jaw, 0);
  assert.equal(murrayParticle(DURATION, 0).jaw, 0);
  const samples = Array.from({length: 100}, (_, i) => murrayParticle(4.2 + i / 100, 0).jaw);
  assert.ok(Math.max(...samples) > .015);
  assert.ok(Math.min(...samples) < -.025);
  assert.ok(samples.every(value => value >= -.04 - 1e-10 && value <= .025));
});

test("disc faces the camera during extraction, before either reveal", () => {
  for (const variant of ["treasure", "murray"] as const) {
    assert.equal(choreography(1.95, variant).cameraFacing, 0);
    assert.ok(choreography(2.6, variant).cameraFacing > .8);
    assert.equal(choreography(2.8, variant).cameraFacing, 1);
    assert.equal(choreography(DURATION, variant).cameraFacing, 1);
  }
});

test("Murray pauses in a straight extraction without spinning", () => {
  assert.equal(choreography(2.85, "murray").disc, .6);
  assert.equal(choreography(3.05, "murray").disc, .6);
  for(let t=0; t<=DURATION; t+=.05) {
    const m=choreography(t, "murray");
    assert.equal(m.turn,0); assert.equal(m.discX,0); assert.equal(m.discZ,0);
  }
});
test("cursed reveal builds pressure, opens before extraction and settles", () => {
  assert.ok(choreography(1.5, "cursed").charge > .9);
  assert.equal(choreography(1.5, "cursed").lid, 0);
  assert.equal(choreography(2.25, "cursed").disc, 0);
  assert.ok(choreography(2.25, "cursed").lid > .9);
  assert.ok(choreography(2.8, "cursed").cameraFacing > .99);
  assert.equal(choreography(2.95, "cursed").flash, 1);
  const end=choreography(DURATION, "cursed");
  assert.equal(end.disc, 1); assert.ok(Math.abs(end.lid)<1e-10); assert.equal(end.turn,0);
  for(let t=0; t<=DURATION; t+=.02) for(const value of Object.values(choreography(t,"cursed"))) assert.ok(Number.isFinite(value));
});

test("cursed disc clears the tray before either rotation channel activates", () => {
  for(let t=0; t<=2.45; t+=.005) {
    const m=choreography(t,"cursed");
    assert.equal(m.tilt,0);
    assert.equal(m.cameraFacing,0);
  }
  assert.ok(choreography(2.45,"cursed").disc > .63);
  assert.equal(choreography(2.8,"cursed").cameraFacing,1);
  for(const t of [2.25,2.45,2.8]) {
    const before=choreography(t-1e-6,"cursed"), after=choreography(t+1e-6,"cursed");
    assert.ok(Math.abs(before.cameraFacing-after.cameraFacing)<.0001);
    assert.ok(Math.abs(before.disc-after.disc)<.0001);
  }
});
test("crypt opens slowly, lifts before tilting, and avoids explosive motion", () => {
  assert.equal(choreography(1.3,"crypt").lid,0);
  assert.ok(choreography(2.5,"crypt").lid > .99);
  assert.equal(choreography(2.55,"crypt").disc,0);
  assert.ok(choreography(3.15,"crypt").disc > .45);
  assert.equal(choreography(3.15,"crypt").cameraFacing,0);
  assert.equal(choreography(3.8,"crypt").cameraFacing,1);
  const end=choreography(DURATION,"crypt");
  assert.equal(end.disc,1); assert.ok(Math.abs(end.lid)<1e-10);
  for(let t=0;t<=DURATION;t+=.02) {
    const m=choreography(t,"crypt");
    assert.equal(m.turn,0); assert.equal(m.shake,0); assert.equal(m.flash,0); assert.equal(m.cameraPunch,0);
    for(const value of Object.values(m)) assert.ok(Number.isFinite(value));
  }
});
test("crypt light precedes opening and atmosphere clears before the CTA", async () => {
  const { cryptAtmosphere } = await import("../components/motion.ts");
  assert.equal(cryptAtmosphere(0).beam,0);
  assert.equal(cryptAtmosphere(1.3).light,1);
  assert.equal(cryptAtmosphere(2.55).track,0);
  assert.equal(cryptAtmosphere(3.8).track,1);
  assert.equal(cryptAtmosphere(6.1).fog,0);
  assert.equal(cryptAtmosphere(DURATION).focus,1);
  assert.equal(cryptAtmosphere(DURATION,true).fog,0);
  for(let t=0;t<DURATION;t+=.03) {
    const a=cryptAtmosphere(t);
    assert.ok(a.fog>=0 && a.fog<=.22);
    assert.ok(a.beam>=0 && a.beam<=.32);
    for(const value of Object.values(a)) assert.ok(Number.isFinite(value));
  }
});
test("gold keeps treasure motion and adds only a bounded, non-looping material accent", async () => {
  const { goldFinish } = await import("../components/motion.ts");
  for(let t=0;t<=DURATION;t+=.025) {
    assert.deepEqual(choreography(t,"gold"),choreography(t,"treasure"));
    const g=goldFinish(t);
    assert.ok(g.reveal>=0 && g.reveal<=1);
    assert.ok(g.rim>=0 && g.rim<=1);
    assert.ok(g.sweep>=-1.6 && g.sweep<=1.6);
    assert.equal(goldFinish(t,true).reveal,0);
    assert.equal(goldFinish(t,true).rim,0);
  }
  assert.ok(goldFinish(4.7).reveal>.99);
  assert.equal(goldFinish(DURATION).reveal,0);
  assert.equal(goldFinish(DURATION).rim,0);
  assert.deepEqual(goldFinish(DURATION),goldFinish(DURATION+20));
});
