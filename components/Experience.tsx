"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { RevealVariant } from "./motion";
import { DEFAULT_MODEL_QUALITY, type ModelQuality } from "./model-quality";
import { playReveal } from "./audio";
import ModelLoader from "./ModelLoader";
const Scene = dynamic(() => import("./Scene"), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.error ? null : this.props.children; }
}
export default function Experience() {
  const [quality, setQuality] = useState<ModelQuality>(DEFAULT_MODEL_QUALITY);
  const [run, setRun] = useState(0);
  const [variant, setVariant] = useState<RevealVariant>("treasure");
  const [rotationKey, setRotationKey] = useState(0);
  const [phase, setPhase] = useState<"loading" | "forming" | "ready" | "opening" | "revealed" | "error">("loading");
  const [sound, setSound] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [info, setInfo] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if(info) dialog.current?.showModal(); else dialog.current?.close(); }, [info]);
  const busy = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => { media.removeEventListener("change", update); void context.current?.close(); };
  }, []);
  const onLoaded = useCallback(() => setPhase("forming"), []);
  const onReady = useCallback(() => setPhase("ready"), []);
  const onComplete = useCallback(() => { busy.current = false; setPhase("revealed"); }, []);
  const onError = useCallback(() => setPhase("error"), []);
  const open = useCallback(() => {
    if (busy.current || (phase !== "ready" && phase !== "revealed")) return;
    busy.current = true;
    setPhase("opening"); setRun(n => n + 1);
    if (sound && !reduced) {
      try {
        context.current ??= new AudioContext();
        void context.current.resume().then(() => playReveal(context.current!, variant)).catch(() => {});
      } catch { /* Audio is optional: WebGL interaction still works. */ }
    }
  }, [phase, sound, reduced, variant]);
  function selectVariant(next: RevealVariant) {
    if (next === variant) return;
    // Cancel scheduled audio and reset the whole scene, including drag/zoom state.
    void context.current?.close();
    context.current = null;
    busy.current = false;
    setRun(0); setRotationKey(0); setPhase("loading"); setVariant(next);
  }
  function selectQuality(next: ModelQuality) {
    if (next === quality) return;
    void context.current?.close();
    context.current = null;
    busy.current = false;
    setRun(0); setRotationKey(0); setPhase("loading"); setQuality(next);
  }
  function toggleSound() {
    setSound(value => {
      if (value) void context.current?.suspend();
      else void context.current?.resume();
      return !value;
    });
  }
  const opened = phase === "revealed";
  const downloadUrl = process.env.NEXT_PUBLIC_GAME_DOWNLOAD_URL;
  return <main className={`experience ${phase} variant-${variant}`}>
    <div className="ambient" aria-hidden="true" />
    <header>
      <div className="variant-switch" role="group" aria-label="Choose an animation">
        <button aria-pressed={variant === "treasure"} onClick={() => selectVariant("treasure")}><span>A</span> Treasure</button>
        <button aria-pressed={variant === "murray"} onClick={() => selectVariant("murray")}><span>B</span> Murray</button>
        <button aria-pressed={variant === "cursed"} onClick={() => selectVariant("cursed")}><span>C</span> Cursed</button>
        <button aria-pressed={variant === "crypt"} onClick={() => selectVariant("crypt")}><span>D</span> The Crypt</button>
        <button aria-pressed={variant === "gold"} onClick={() => selectVariant("gold")}><span>E</span> Cursed Gold</button>
      </div>
      <label className="quality-control">
        <span>Detail</span>
        <select aria-label="Model quality" value={quality} onChange={e => selectQuality(e.target.value as ModelQuality)}>
          <option value="2k">2K · Standard</option>
          <option value="4k">4K · High</option>
        </select>
      </label>
      <button className="sound-button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute sound" : "Enable sound"}>
        <span className={`wave ${sound ? "active" : ""}`} aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} />)}</span>
        Sound {sound ? "on" : "off"}
      </button>
    </header>
    <section className="intro">
      <div className="collection"><span /> From the archives, into your hands</div>
      <h1>{variant === "gold" ? "Not all that glitters is gold." : variant === "crypt" ? "Some legends wait in the dark." : variant === "cursed" ? "Not every treasure lies dormant." : variant === "treasure" ? "A classic. A treasure." : "Some treasures never rest."}</h1>
      <p>{variant === "gold" ? "A treasure with a touch of a curse." : variant === "crypt" ? "Follow the light. Find your treasure." : variant === "cursed" ? "Break the seal. Unleash the adventure." : variant === "treasure" ? "Open the case. Rediscover the adventure." : "Murray has something to say about that."}</p>
    </section>
    <section className="stage" data-phase={phase} aria-busy={phase === "loading" || phase === "forming"} tabIndex={phase === "ready" || opened ? 0 : -1}
      aria-label={opened ? "3D disc. Move your mouse left or right to rotate it, drag on a touchscreen, or use the arrow keys." : "3D Monkey Island case. Click the case or press Enter to open it."}
      onKeyDown={e => {
        if ((phase === "ready" || opened) && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault(); open();
        }
        if(opened && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          e.preventDefault(); setRotationKey(n => n + (e.key === "ArrowLeft" ? -0.4 : 0.4));
        }
      }}>
      <SceneBoundary key={variant + quality} onError={onError}><Scene quality={quality} variant={variant} rotationKey={rotationKey} run={run} reduced={reduced} onLoaded={onLoaded} onReady={onReady} onComplete={onComplete} onOpen={open} /></SceneBoundary>
    </section>
    {phase === "loading" && <ModelLoader />}
    <aside className="artifact-label"><span className="label-line" /><div><strong>The Curse of<br />Monkey Island</strong><span>PC · CD-ROM · 1997</span></div></aside>
    <section className={phase === "loading" || phase === "forming" || phase === "error" ? "interaction" : "sr-only"}>
      <div className="status" role="status" aria-live="polite">
        {phase === "loading" ? "Preparing your treasure…" : phase === "forming" ? "A treasure takes shape…" : phase === "error" ? "The 3D scene could not load. Reload the page with WebGL enabled." : phase === "opening" ? "Some things never lose their magic." : opened ? (variant === "treasure" ? "Welcome back, pirate." : "The treasure is yours. So is the curse.") : "Click the case to open it."}
      </div>
      {phase === "error" && <button className="open-button" onClick={() => location.reload()}>Try again</button>}
    </section>
    {opened && <section className="download-cta" aria-label="HD edition">
      <span className="download-eyebrow">The classic, remastered in HD</span>
      {downloadUrl
        ? <a className="open-button" href={downloadUrl}>Download HD edition</a>
        : <button className="open-button" disabled aria-describedby="download-pending">Download HD edition</button>}
      {!downloadUrl && <small id="download-pending">Download coming soon</small>}
    </section>}
    <footer><span>A small ritual. A timeless classic.</span><button onClick={() => setInfo(true)}>About this piece <span>＋</span></button><span className="edition">Interactive archive / 001</span></footer>
    <dialog ref={dialog} className="info-modal" aria-labelledby="info-title" onClose={() => setInfo(false)} onClick={e => { if(e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) setInfo(false); } }}>
      <button autoFocus className="close" onClick={() => setInfo(false)} aria-label="Close">×</button>
      <span>The piece</span><h2 id="info-title">One case.<br />A thousand memories.</h2><p>An interactive tribute to The Curse of Monkey Island, the classic 1997 adventure from LucasArts.</p><p>3D model supplied by the project creator. Procedural animation, studio lighting, and synthesized sound bring this little digital ritual to life.</p><small>An unofficial experiment. Trademarks and artwork belong to their respective owners.</small>
    </dialog>
  </main>;
}
