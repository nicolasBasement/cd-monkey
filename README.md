# Monkey Island — CD reveal

An interactive jewel-case reveal built with Next.js, React Three Fiber, and Three.js. Five animation variants share the supplied Monkey Island model, with procedural motion rather than playback of its embedded animation.

## Run locally

Requires Node.js 22.18 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a static production build, run `npm run build` followed by `npm start`; exported files are in `out/`.

If Sharp tries to build against a globally installed libvips, use `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

## Controls and variants

Click the closed case to open it, or focus the viewer with Tab and press Enter/Space. Once revealed, move the mouse horizontally to rotate the disc, drag on touchscreens, or use the left/right arrow keys. Click the case again to replay.

| Variant | Treatment |
| --- | --- |
| A · Treasure | Original gold reveal, anticipation, flash, expanding ring, and case closure. |
| B · Murray | Straight levitation with a short pause and four laughing-skull appearances; no lateral orbit or full spin. |
| C · Cursed | Green charge and a short extraction. The disc lifts flat before turning toward the camera to clear the tray. |
| D · The Crypt | Slow opening, a diagonal light shaft, and low world-space volumetric fog. No explosive flash or skulls. |
| E · Cursed Gold | Treasure-based motion with a brief 10° material-inspection tilt, view-dependent gold foil, and two smaller, softer ring echoes. |

Switching variant or model quality resets the scene and cancels scheduled audio. The disc finishes centered horizontally, separated from the case, with the download CTA below. Reduced motion skips to the final pose without reveal particles, camera shake, bloom, or reveal audio; The Crypt uses a static low-intensity shaft without fog.

## Model quality

The optimized GLBs supplied by the project creator are used without recompression:

- `public/models/cd-2k.glb`: 1.55 MB; the default **2K · Standard** setting.
- `public/models/cd-4k.glb`: 3.31 MB; requested only when **4K · High** is selected.

The **Detail** selector changes model texture quality, not canvas resolution. Browser/loader caching can retain a previously selected model. Source files in Downloads are not modified.

For replacement exports, preserve the separate parts, transforms, and hinge: `Top`, `Back`, `CD_low.001`, and `CD_low.002`. Three.js sanitizes the disc names to `CD_low001` and `CD_low002`. Both supplied exports retain the main transforms; the negligible cover-back translation in the provisional model is absent. New pivots require adjusting the poses in `Scene.tsx`.

The optional utility `npm run optimize-model -- /path/to/model.glb [output.glb]` writes `public/models/cd-2k.glb` by default. Do not run it on the already optimized assets unless you intend to replace them.

## HD download

Set `NEXT_PUBLIC_GAME_DOWNLOAD_URL` to the actual download URL before building. Without it, the CTA is disabled and displays **Download coming soon**. No game download is bundled with this project.

## Implementation map

| File | Responsibility |
| --- | --- |
| `components/Experience.tsx` | English UI, phase state, quality selection, replay, audio controls, modal, accessibility, and CTA. |
| `components/model-quality.ts` | Quality names, asset URLs, and the 2K default. |
| `components/motion.ts` | The 6.8-second choreography, easing, event timing, gold tilt, and atmospheric envelopes. |
| `components/Scene.tsx` | Model poses, camera framing, interaction, material assignment, and lights. |
| `components/RevealEffects.tsx` | Charge outline, rays, particles, and ring effects. |
| `components/gold-material.ts` / `gold-rings.ts` | View-dependent foil and feathered rings for Cursed Gold only. |
| `components/CryptAtmosphere.tsx` | 32-step world-space volumetric shader with a bounded-resolution scene-depth prepass; not per-object volumetric shadowing. |
| `components/MurrayParticles.tsx` / `murray-motion.ts` | Chroma-keyed skull sprites, staggered motion, and simulated jaw animation. |
| `components/audio.ts` | Synthesized charge, latch, whoosh, and impact cues. |

The clear hub has its own translucent material rather than the opaque disc finish. The full-viewport canvas uses a projected-bounds guard; visual inspection remains necessary for clipping and silhouette overlap throughout the animation.

## Validate

```sh
npm test
npm run typecheck
npm run build
```

Tests cover phase order, finite poses, continuity, reduced-motion envelopes, ring echoes, and the optimized model naming/transform contract. Also inspect normal-speed playback, mobile layout, both qualities, shader console errors, replay, mid-animation switching, sound, and keyboard/touch input. Passing tests does not certify visual polish or device GPU performance.

## Assets and attribution

`public/textures/murray-reference.png` is the user-supplied screenshot of the Murray GIF from Monkey Island Wiki. Its mustard background is removed in the shader through chroma key and UV cropping. Jaw movement simulates a laugh from this static image; it does not reproduce the original GIF frames. The source image is unchanged.

Pirata One and IM Fell English provide the visible typography; fonts are served locally and their licenses are in `public/fonts/`. The wooden CTA is CSS. The reference video and private files are not included. This is an unofficial experiment; the game's artwork and trademarks belong to their respective owners.
