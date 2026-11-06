"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import CryptAtmosphere from "./CryptAtmosphere";
import MurrayParticles from "./MurrayParticles";
import { choreography, goldEcho, revealAt, DURATION, smooth, type RevealVariant } from "./motion";

export default function RevealEffects({ variant, time, reduced, anchor, caseRig }: { caseRig: RefObject<THREE.Group | null>; variant: RevealVariant; time: { current: number }; reduced: boolean; anchor: THREE.Vector3 }) {
  const haunted = variant !== "treasure" && variant !== "gold";
  const crypt = variant === "crypt";
  const cursed = variant === "cursed";
  const color = useMemo(() => haunted ? new THREE.Color(2.2, 5, 4.2) : new THREE.Color(4, 2.7, 1), [haunted]);
  const rays = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const echoes = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Points>(null);
  const glint = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const sparkle = useMemo(() => {
    const pixels = new Uint8Array(32 * 32 * 4);
    for(let y = 0; y < 32; y++) for(let x = 0; x < 32; x++) {
      const dx = (x - 15.5) / 16, dy = (y - 15.5) / 16;
      const core = Math.exp(-(dx * dx + dy * dy) * 45);
      const cross = Math.exp(-Math.abs(dx) * 55 - Math.abs(dy) * 5) + Math.exp(-Math.abs(dy) * 55 - Math.abs(dx) * 5);
      const i = (y * 32 + x) * 4;
      pixels[i] = pixels[i+1] = pixels[i+2] = 255;
      pixels[i+3] = Math.min(255, (core + cross * .55) * 255);
    }
    const texture = new THREE.DataTexture(pixels, 32, 32);
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => sparkle.dispose(), [sparkle]);
  const uniforms = useMemo(() => ({ uStrength: { value: 0 }, uTime: { value: 0 }, uColor: { value: haunted ? new THREE.Color(3.5, 8, 6.7) : new THREE.Color(9, 5.5, 1.6) } }), [haunted]);
  const positions = useMemo(() => new Float32Array(160 * 3), []);
  const vertices = useMemo(() => Array.from({ length: 160 }, (_, i) => {
    const angle = i * 2.39996;
    return [Math.cos(angle), Math.sin(i * 13.7) * 0.6 + 0.35, Math.sin(angle), 0.6 + (i % 13) / 13];
  }), []);
  useFrame(({ camera }) => {
    const t = time.current;
    const m = choreography(t, variant);
    const age = t - revealAt(variant);
    uniforms.uStrength.value = reduced ? 0 : m.rays;
    uniforms.uTime.value = Math.max(age, 0);
    camera.getWorldDirection(direction);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    if (light.current) {
      light.current.position.copy(anchor).addScaledVector(direction, -0.8);
      light.current.intensity = reduced || crypt ? 0 : m.flash * 28;
    }
    if (glint.current) {
      glint.current.visible = !crypt && !reduced && m.foil > 0.12 && m.foil < 0.88;
      glint.current.position.copy(anchor).addScaledVector(right, (m.foil - 0.5) * 1.8).addScaledVector(up, 0.42).addScaledVector(direction, -0.25);
      glint.current.scale.setScalar(0.45 + Math.sin(m.foil * Math.PI) * 0.4);
      (glint.current.material as THREE.SpriteMaterial).opacity = Math.sin(m.foil * Math.PI);
    }
    if (rays.current) {
      rays.current.visible = !crypt && !reduced && m.rays > 0.005;
      rays.current.quaternion.copy(camera.quaternion);
      rays.current.position.copy(anchor).addScaledVector(direction, 0.35);
    }
    if (ring.current) {
      ring.current.visible = !crypt && !reduced && age > 0 && age < 1.45;
      if (cursed) {
        ring.current.position.copy(anchor).addScaledVector(direction, .3);
        ring.current.quaternion.copy(camera.quaternion);
      }
      ring.current.scale.setScalar(0.25 + m.shockwave * 4.8);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - m.shockwave) * 0.85;
    }
    if (echoes.current) {
      echoes.current.children.forEach((object, index) => {
        const echo = goldEcho(t, index, reduced);
        const mesh = object as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
        mesh.visible = echo.visible;
        mesh.scale.setScalar(echo.radius);
        mesh.material.opacity = echo.opacity;
      });
    }
    if (outline.current) {
      outline.current.visible = !cursed && !crypt && !reduced && m.charge > 0.01;
      if (caseRig.current) outline.current.matrix.copy(caseRig.current.matrixWorld);
      outline.current.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
          // LineMaterial exposes opacity directly.
          object.material.opacity = m.charge;
        }
      });
    }
    if (dust.current) {
      dust.current.visible = !cursed && !crypt && !reduced && ((age > 0 && age < 3.1) || m.charge > 0.1);
      vertices.forEach(([x, y, z, speed], i) => {
        if (age < 0) {
          const phase = (t * 0.7 + i / 160) % 1;
          positions[i * 3] = x * (1.55 - phase * 0.4);
          positions[i * 3 + 1] = -0.5 + phase * 1.3;
          positions[i * 3 + 2] = z * (1.45 - phase * 0.3);
        } else {
          const radius = (1 - Math.exp(-age * 1.6)) * speed * 2;
          positions[i * 3] = anchor.x + x * radius * 1.5;
          positions[i * 3 + 1] = anchor.y + y * radius - age * age * 0.13;
          positions[i * 3 + 2] = anchor.z + z * radius;
        }
      });
      dust.current.geometry.attributes.position.needsUpdate = true;
      (dust.current.material as THREE.PointsMaterial).opacity = age < 0 ? m.charge * 0.35 : Math.max(0, 1 - age / 3.1) * (1 - smooth((t - DURATION + .4) / .4));
    }
  });
  return <>
    {crypt && <CryptAtmosphere time={time} reduced={reduced} anchor={anchor} />}
    {variant === "murray" && <MurrayParticles time={time} anchor={anchor} reduced={reduced} />}
    <group ref={outline} matrixAutoUpdate={false}>
      <Line points={[[-1.54, 0, -1.3], [1.45, 0, -1.3], [1.45, 0, 1.4], [-1.54, 0, 1.4], [-1.54, 0, -1.3]]} color={haunted ? color : new THREE.Color(4, 2.2, 0.6)} lineWidth={2.2} transparent toneMapped={false} />
    </group>
    <mesh ref={rays} position={[0, 1.8, -0.75]} renderOrder={-1}>
      <planeGeometry args={[12, 12]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`
          varying vec2 vUv; uniform float uStrength; uniform float uTime; uniform vec3 uColor;
          void main(){
            vec2 p=(vUv-.5)*2.; float r=length(p); float a=atan(p.y,p.x);
            float streak=pow(max(0.,sin(a*11.+sin(a*7.)*1.8+uTime*.10)),12.);
            float rays=streak*exp(-r*3.)*smoothstep(.08,.2,r);
            float halo=exp(-r*r*65.)*.45;
            float alpha=(rays+halo)*uStrength*(1.-smoothstep(.65,1.,r));
            if(alpha < .001) discard;
            gl_FragColor=vec4(uColor,alpha);
          }`} />
    </mesh>
    <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, -1.01, 0]} visible={false}>
      <ringGeometry args={[0.972, 1, 128]} />
      <meshBasicMaterial color={haunted ? [2, 5, 4] : [5, 3, 1]} transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {variant === "gold" && <group ref={echoes}>
      {[0, 1].map(index => <mesh key={index} rotation-x={-Math.PI / 2} position={[0, -1.01, 0]} visible={false}>
        <ringGeometry args={[.975, 1, 128]} />
        <meshBasicMaterial color={[2.2, 1.3, .4]} transparent opacity={0} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>)}
    </group>}
    <pointLight ref={light} distance={5} color={haunted ? "#a9ffe2" : "#ffe5ab"} intensity={0} />
    <sprite ref={glint} visible={false}>
      <spriteMaterial map={sparkle} color={[5, 4.5, 3.5]} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </sprite>
    <points ref={dust} visible={false} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial map={sparkle} color={color} size={0.08} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  </>;
}
