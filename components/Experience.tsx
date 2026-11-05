"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { playReveal } from "./audio";
const Scene = dynamic(() => import("./Scene"), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.error ? null : this.props.children; }
}
export default function Experience() {
  const [run, setRun] = useState(0);
  const [rotationKey, setRotationKey] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "opening" | "revealed" | "error">("loading");
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
  const onReady = useCallback(() => setPhase("ready"), []);
  const onComplete = useCallback(() => { busy.current = false; setPhase("revealed"); }, []);
  const onError = useCallback(() => setPhase("error"), []);
  const open = useCallback(() => {
    if (busy.current || phase === "loading" || phase === "error") return;
    busy.current = true;
    setPhase("opening"); setRun(n => n + 1);
    if (sound && !reduced) {
      try {
        context.current ??= new AudioContext();
        void context.current.resume().then(() => playReveal(context.current!)).catch(() => {});
      } catch { /* Audio is optional: WebGL interaction still works. */ }
    }
  }, [phase, sound, reduced]);
  function toggleSound() {
    setSound(value => {
      if (value) void context.current?.suspend();
      else void context.current?.resume();
      return !value;
    });
  }
  const opened = phase === "revealed";
  return <main className={`experience ${phase}`}>
    <div className="ambient" aria-hidden="true" />
    <header>
      <button className="sound-button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Desactivar sonido" : "Activar sonido"}>
        <span className={`wave ${sound ? "active" : ""}`} aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} />)}</span>
        Sonido {sound ? "on" : "off"}
      </button>
    </header>
    <section className="intro">
      <div className="collection"><span /> Del archivo, a tus manos</div>
      <h1>Un clásico. Un tesoro.</h1>
      <p>Abrí la caja. Volvé a descubrirlo.</p>
    </section>
    <section className="stage" tabIndex={opened ? 0 : -1}
      aria-label={opened ? "Disco 3D. Arrastralo para girar, o usá las flechas izquierda y derecha." : "Caja de Monkey Island en 3D. Usá el botón Abrir la caja."}
      onKeyDown={e => {
        if(opened && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          e.preventDefault(); setRotationKey(n => n + (e.key === "ArrowLeft" ? -0.4 : 0.4));
        }
      }}>
      <SceneBoundary onError={onError}><Scene rotationKey={rotationKey} run={run} reduced={reduced} onReady={onReady} onComplete={onComplete} onOpen={open} /></SceneBoundary>
    </section>
    <aside className="artifact-label"><span className="label-line" /><div><strong>The Curse of<br />Monkey Island</strong><span>PC · CD-ROM · 1997</span></div></aside>
    <section className="interaction">
      <div className="status" role="status" aria-live="polite">
        {phase === "loading" ? "Preparando tu tesoro…" : phase === "error" ? "No pudimos cargar la escena 3D. Recargá la página con WebGL activado." : phase === "opening" ? "Hay cosas que nunca pierden su magia." : opened ? "Bienvenido de vuelta, pirata." : "La nostalgia está a un clic."}
      </div>
      {phase === "error" ? <button className="open-button" onClick={() => location.reload()}>Volver a intentar</button> :
      <button className="open-button" onClick={open} disabled={phase === "loading" || phase === "opening"}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" stroke="currentColor" strokeWidth="1.4" /></svg>
        {phase === "loading" ? "Cargando escena" : phase === "opening" ? "Descubriendo…" : opened ? "Volver a abrir" : "Abrir la caja"}
        <span className="button-arrow" aria-hidden="true">{opened ? "↻" : "↗"}</span>
      </button>}
      <span className="interaction-hint">{opened ? "Arrastrá el CD para girarlo · Mouse o touch" : "También podés hacer clic en la caja."}</span>
    </section>
    <footer><span>Un pequeño ritual. Un gran clásico.</span><button onClick={() => setInfo(true)}>Acerca de esta pieza <span>＋</span></button><span className="edition">Archivo interactivo / 001</span></footer>
    <dialog ref={dialog} className="info-modal" aria-labelledby="info-title" onClose={() => setInfo(false)} onClick={e => { if(e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) setInfo(false); } }}>
      <button autoFocus className="close" onClick={() => setInfo(false)} aria-label="Cerrar">×</button>
      <span>La pieza</span><h2 id="info-title">Una caja.<br />Mil recuerdos.</h2><p>Un homenaje interactivo a The Curse of Monkey Island, el clásico de aventuras de LucasArts de 1997.</p><p>Modelo 3D proporcionado por el autor del proyecto. Animación procedural, iluminación de estudio y sonido sintetizado para este pequeño ritual digital.</p><small>Experimento no oficial. Las marcas y el arte pertenecen a sus respectivos titulares.</small>
    </dialog>
  </main>;
}
