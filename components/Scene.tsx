"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { choreography, goldFinish, goldPose, DURATION, framing, fittedZoom, smooth, type RevealVariant } from "./motion";
import { applyGoldFinish } from "./gold-material";
import RevealEffects from "./RevealEffects";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

const modelBody = (mesh: THREE.Mesh) => mesh.name === "CD_low001" || mesh.name === "CD_low.001";

type Props = { variant: RevealVariant; rotationKey: number; run: number; reduced: boolean; onReady: () => void; onComplete: () => void; onOpen: () => void };
function Artifact({ variant, rotationKey, run, reduced, onReady, onComplete, onOpen }: Props) {
  const { scene } = useGLTF("/models/cd.glb");
  const rig = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const discAnchor = useMemo(() => new THREE.Vector3(), []);
  const time = useRef(0);
  const foil = useMemo(() => ({ value: -4 }), []);
  const gold = useMemo(() => ({ sweep: { value: -1.6 }, reveal: { value: 0 }, rim: { value: 0 } }), []);
  const finished = useRef(false);
  const zoom = useRef<number | null>(null);
  const { camera, pointer, size, gl } = useThree();
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0, currentYaw: 0, currentPitch: 0 });
  const priorKey = useRef(rotationKey);
  const hoverX = useRef<number | null>(null);
  useEffect(() => {
    const canvas = gl.domElement;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (finished.current && !drag.current.active && hoverX.current !== null) {
        drag.current.yaw += (event.clientX - hoverX.current) * 0.009;
      }
      hoverX.current = event.clientX;
    };
    const reset = () => { hoverX.current = null; };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", reset);
    canvas.addEventListener("pointerenter", reset);
    return () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", reset);
      canvas.removeEventListener("pointerenter", reset);
    };
  }, [gl]);
  useEffect(() => {
    drag.current.yaw += rotationKey - priorKey.current;
    priorKey.current = rotationKey;
  }, [rotationKey]);
  const manualRotation = useMemo(() => new THREE.Quaternion(), []);
  const manualEuler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const top = clone.getObjectByName("Top")!;
    const discs = [clone.getObjectByName("CD_low001"), clone.getObjectByName("CD_low002")].filter(Boolean) as THREE.Object3D[];
    // GLTFLoader sanitizes periods in node names. Match fallback names for future exports.
    if (!discs.length) clone.traverse(n => { if (n.name.startsWith("CD_low") && (n as THREE.Mesh).isMesh) discs.push(n); });
    clone.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // The clear hub is a separate mesh. Do not apply the opaque foil material.
      if (mesh.name === "CD_low002" || mesh.name === "CD_low.002") {
        mesh.material = new THREE.MeshPhysicalMaterial({
          name: "Clear tinted hub",
          color: variant !== "treasure" && variant !== "gold" ? "#416869" : "#506583",
          transparent: true, opacity: 0.18, depthWrite: false,
          metalness: 0, roughness: 0.075, clearcoat: 1, clearcoatRoughness: 0.06,
          envMapIntensity: 0.2, side: THREE.FrontSide,
        });
        return;
      }
      const original = mesh.material as THREE.MeshPhysicalMaterial;
      const material = original.clone();
      if (material.name === "glass") {
        material.envMapIntensity = 0.3;
        material.roughness = 0.015;
      }
      if (material.name === "DefaultMaterial.001") {
        material.transmission = 0;
        material.metalness = 0.45;
        material.roughness = 0.22;
        material.iridescence = 1;
        material.iridescenceIOR = 1.35;
        material.iridescenceThicknessRange = [150, 420];
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uFoil = foil;
          shader.vertexShader = "varying vec3 vFoil;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFoil = position;");
          shader.fragmentShader = "uniform float uFoil; varying vec3 vFoil;\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            float stripe = exp(-pow((vFoil.x + vFoil.y * .35 - uFoil) * 4., 2.));
            vec3 rainbow = .55 + .45*cos(vec3(0.,2.1,4.2) + vFoil.x*2.5);
            totalEmissiveRadiance += rainbow * stripe * 1.8;`);
        };
        material.customProgramCacheKey = () => "cd-foil-v1";
      }
      if (variant === "gold" && modelBody(mesh)) applyGoldFinish(material, mesh.geometry, gold);
      mesh.material = material;
    });
    return {
      scene: clone, top, discs,
      closed: top.quaternion.clone(),
      // Only the pose comes from the reference; all timing is procedural.
      opened: new THREE.Quaternion(-0.4986691475, -0.4985812604, -0.5014076829, 0.5013343692),
      positions: discs.map(d => d.position.clone()),
      rotations: discs.map(d => d.quaternion.clone()),
      scales: discs.map(d => d.scale.clone()),
    };
  }, [scene, foil, gold, variant]);
  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => {
    time.current = 0; finished.current = false; hoverX.current = null;
    Object.assign(drag.current, { active: false, yaw: 0, pitch: 0, currentYaw: 0, currentPitch: 0 });
    gl.domElement.style.cursor = "pointer";
    model.top.quaternion.copy(model.closed);
    model.discs.forEach((d, i) => { d.position.copy(model.positions[i]); d.quaternion.copy(model.rotations[i]); });
  }, [run, model, gl]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const bounds = useMemo(() => new THREE.Box3(), []);
  const lookPoint = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const face = useMemo(() => new THREE.Quaternion(), []);
  const goldRotation = useMemo(() => new THREE.Quaternion(), []);
  const goldEuler = useMemo(() => new THREE.Euler(), []);
  const cameraFacing = useMemo(() => new THREE.Quaternion(), []);
  const parentRotation = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, delta) => {
    if (!rig.current) return;
    if (run > 0) time.current = reduced ? DURATION : Math.min(time.current + delta, DURATION);
    const t = run > 0 ? time.current : 0;
    const m = choreography(t, variant);
    const narrow = size.width < 700;
    model.top.quaternion.slerpQuaternions(model.closed, model.opened, m.lid);
    const follow = reduced ? 1 : 1 - Math.exp(-delta * 16);
    drag.current.currentYaw = THREE.MathUtils.lerp(drag.current.currentYaw, drag.current.yaw, follow);
    drag.current.currentPitch = THREE.MathUtils.lerp(drag.current.currentPitch, drag.current.pitch, follow);
    manualEuler.set(drag.current.currentPitch, drag.current.currentYaw, 0, "YXZ");
    manualRotation.setFromEuler(manualEuler);
    model.discs.forEach((disc, i) => {
      disc.position.copy(model.positions[i]);
      disc.position.x += m.discX + (narrow ? 0 : 0.165) * m.presentation;
      disc.position.z += m.discZ;
      disc.position.y += 0.18317 * m.disc + (narrow ? 0.03 : 0.015) * m.presentation;
      disc.scale.copy(model.scales[i]).multiplyScalar(1 + m.presentation * 0.75);
      // Turn the disc upright as it clears the tray, then hold it edge-on
      // before the fast final turn. Both meshes must stay perfectly aligned.
      spin.setFromAxisAngle(axis, m.turn);
      disc.quaternion.slerpQuaternions(model.rotations[i], face, m.tilt);
      disc.quaternion.premultiply(spin);

    });
    foil.value = -4 + m.foil * 8;
    const finish = goldFinish(t, reduced);
    gold.sweep.value = finish.sweep;
    gold.reveal.value = finish.reveal;
    gold.rim.value = finish.rim;
    const idle = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.65) * 0.025 * (1 - smooth((t - 5.4) / 1.1));
    rig.current.rotation.set(0.06 + m.shake, -0.24 + m.caseYaw + m.shake * 1.8 + (!run ? pointer.x * 0.08 : 0), -0.10 + m.shake);
    rig.current.position.x = (narrow ? 0 : -2.6) * m.presentation;
    rig.current.position.y = -0.6 - (narrow ? 1.0 : 0.7) * m.presentation + idle - m.anticipation * 0.12 + m.levitation;
    const scale = 1 - m.anticipation * 0.035 - m.camera * 0.28;
    rig.current.scale.setScalar(scale);
    rig.current.updateWorldMatrix(true, true);
    model.discs[0].getWorldPosition(discAnchor);
    target.set((narrow ? 1.1 : 2.3) - m.camera * (narrow ? 0.5 : 1.7), 5.6 - m.camera * 1.2, (narrow ? 8.5 : 6.3) + m.camera * 1.65);
    if (variant === "murray") target.x = -2.3 + m.camera * 2.9;
    target.x = THREE.MathUtils.lerp(target.x, discAnchor.x, m.presentation);
    target.z += m.anticipation * 0.25 + m.cameraPunch - m.tension * 0.4;
    camera.position.lerp(target, reduced ? 1 : 1 - Math.exp(-delta * 5));
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = 37 - (reduced ? 0 : m.flash * 2);
    const fit = framing(size.width, size.height);
    const baseZoom = THREE.MathUtils.lerp(Math.min(0.76, fit.zoom), fit.zoom, m.presentation);
    perspective.zoom = baseZoom;
    perspective.setViewOffset(size.width, size.height, 0, fit.offsetY, size.width, size.height);
    perspective.updateProjectionMatrix();
    lookPoint.set(discAnchor.x * m.presentation, 0.1 + m.camera * 0.8, discAnchor.z * m.presentation);
    camera.lookAt(lookPoint);
    camera.updateMatrixWorld();
    // Resolve the final pose in camera space, cancelling the case/GLB parents.
    // Blend before completion so there is no snap when interaction becomes active.
    const pose = goldPose(t, reduced);
    goldEuler.set(pose.pitch, pose.yaw, 0, "YXZ");
    goldRotation.setFromEuler(goldEuler);
    model.discs.forEach(disc => {
      disc.parent!.getWorldQuaternion(parentRotation);
      cameraFacing.copy(parentRotation).invert().multiply(camera.quaternion);
      if (variant === "gold") cameraFacing.multiply(goldRotation);
      if (t >= DURATION) cameraFacing.multiply(manualRotation);
      disc.quaternion.slerp(cameraFacing, m.cameraFacing);
    });
    rig.current.updateWorldMatrix(true, true);
    // Exact mesh bounds, including lid overshoot and manual disc rotation.
    // A final projection guard keeps every phase inside the UI's safe area.
    model.discs[0].getWorldPosition(discAnchor);
    bounds.setFromObject(rig.current, true);
    let extentX = 0, extentY = 0;
    for (let corner = 0; corner < 8; corner++) {
      projected.set(
        corner & 1 ? bounds.max.x : bounds.min.x,
        corner & 2 ? bounds.max.y : bounds.min.y,
        corner & 4 ? bounds.max.z : bounds.min.z
      ).project(camera);
      extentX = Math.max(extentX, Math.abs(projected.x * size.width / 2));
      extentY = Math.max(extentY, Math.abs(-projected.y * size.height / 2 + fit.offsetY));
    }
    const safeHeight = Math.max(140, size.height - 190);
    const correction = Math.min(1, (size.width - 48) / (2 * extentX), safeHeight / (2 * extentY));
    zoom.current = fittedZoom(baseZoom, correction, reduced ? null : zoom.current, delta);
    perspective.zoom = zoom.current;
    perspective.updateProjectionMatrix();
    if (glow.current) glow.current.intensity = 0.05 + m.charge * (variant === "crypt" ? 3 : 8) + m.flash * 12;
    if (run && t >= DURATION && !finished.current) { finished.current = true; gl.domElement.style.cursor = "default"; onComplete(); }
  }, -2);
  function isDisc(e: ThreeEvent<PointerEvent>) {
    return model.discs.includes(e.object);
  }
  function pointerDown(e: ThreeEvent<PointerEvent>) {
    if (!finished.current || !isDisc(e)) return;
    e.stopPropagation();
    Object.assign(drag.current, { active: true, x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    gl.domElement.style.cursor = "grabbing";
  }
  function pointerMove(e: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return;
    e.stopPropagation();
    drag.current.yaw += (e.clientX - drag.current.x) * 0.012;
    drag.current.pitch = THREE.MathUtils.clamp(drag.current.pitch + (e.clientY - drag.current.y) * 0.01, -1.3, 1.3);
    drag.current.x = e.clientX; drag.current.y = e.clientY;
  }
  function pointerUp(e: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return;
    e.stopPropagation();
    drag.current.active = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    gl.domElement.style.cursor = "default";
  }
  return <>
    <group ref={rig}
      onClick={(e) => { e.stopPropagation(); if (!finished.current || !model.discs.includes(e.object)) onOpen(); }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onPointerOver={(e) => { if(finished.current && isDisc(e)) gl.domElement.style.cursor = "default"; }}
      onPointerOut={() => { if(!drag.current.active) gl.domElement.style.cursor = finished.current ? "default" : "pointer"; }}>
      <group scale={22}><primitive object={model.scene} position={[-0.006, -0.075, -0.005]} /></group>
      <pointLight ref={glow} position={[0, 0.4, 0]} color={variant === "cursed" ? "#b5ff60" : variant === "murray" ? "#8ce8da" : "#ffbb62"} distance={8} />
    </group>
    <RevealEffects caseRig={rig} variant={variant} time={time} reduced={reduced} anchor={discAnchor} />
  </>;
}
export default function Scene(props: Props) {
  return <Canvas dpr={[1, 1.5]} camera={{ position: props.variant === "murray" ? [-2.3, 5.6, 6.3] : [2.3, 5.6, 6.3], fov: 37 }} gl={{ antialias: true, alpha: true }} shadows>
    <ambientLight intensity={props.variant === "crypt" ? 0.35 : 0.75} />
    <directionalLight position={[3, 7, 5]} intensity={props.variant === "crypt" ? 1.1 : 3} color="#e4e9ff" />
    <directionalLight position={[-4, 2, -2]} intensity={props.variant === "crypt" ? 1.8 : 5} color={props.variant === "cursed" ? "#9bdb5c" : props.variant === "murray" ? "#75dace" : "#657bff"} />
    <Suspense fallback={null}>
      <Environment resolution={256}>
        <Lightformer position={[0, 5, -2]} scale={[7, 3, 1]} intensity={4} color="#e4edff" rotation-x={Math.PI / 2} />
        <Lightformer position={[-4, 2, 2]} scale={[2, 6, 1]} intensity={3} color="#8d9bff" rotation-y={Math.PI / 2} />
        <Lightformer position={[3, 3, 4]} scale={[3, 5, 1]} intensity={4} color="#ffdc9f" rotation-y={-Math.PI / 3} />
      </Environment>
      <Artifact {...props} />
      {!props.reduced && <EffectComposer multisampling={0}><Bloom intensity={0.8} luminanceThreshold={1.15} luminanceSmoothing={0.3} mipmapBlur /></EffectComposer>}

    </Suspense>
  </Canvas>;
}
