"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { choreography, REVEAL_AT } from "./motion";

export default function RevealEffects({ time, reduced }: { time: { current: number }; reduced: boolean }) {
  const rays = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const outline = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Points>(null);
  const uniforms = useMemo(() => ({ uStrength: { value: 0 }, uTime: { value: 0 } }), []);
  const positions = useMemo(() => new Float32Array(160 * 3), []);
  const vertices = useMemo(() => Array.from({ length: 160 }, (_, i) => {
    const angle = i * 2.39996;
    return [Math.cos(angle), Math.sin(i * 13.7) * 0.6 + 0.35, Math.sin(angle), 0.6 + (i % 13) / 13];
  }), []);
  useFrame(({ camera }) => {
    const t = time.current;
    const m = choreography(t);
    const age = t - REVEAL_AT;
    uniforms.uStrength.value = reduced ? 0 : m.rays;
    uniforms.uTime.value = Math.max(age, 0);
    if (rays.current) {
      rays.current.visible = !reduced && m.rays > 0.005;
      rays.current.quaternion.copy(camera.quaternion);
    }
    if (ring.current) {
      ring.current.visible = !reduced && age > 0 && age < 1.45;
      ring.current.scale.setScalar(0.25 + m.shockwave * 5.5);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - m.shockwave) * 0.85;
    }
    if (outline.current) {
      outline.current.visible = !reduced && m.charge > 0.01;
      outline.current.scale.setScalar(1 - m.anticipation * 0.035);
      outline.current.position.y = -0.5 - m.anticipation * 0.12;
      outline.current.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
          // LineMaterial exposes opacity directly.
          object.material.opacity = m.charge;
        }
      });
    }
    if (dust.current) {
      dust.current.visible = !reduced && age > 0 && age < 2.8;
      vertices.forEach(([x, y, z, speed], i) => {
        const radius = Math.max(age, 0) * speed;
        positions[i * 3] = x * radius * 2.8;
        positions[i * 3 + 1] = 1.8 + y * radius * 2 - radius * radius * 0.3;
        positions[i * 3 + 2] = z * radius * 2;
      });
      dust.current.geometry.attributes.position.needsUpdate = true;
      (dust.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 2.8);
    }
  });
  return <>
    <group ref={outline} rotation={[0.06, -0.24, -0.10]}>
      <Line points={[[-1.54, 0, -1.3], [1.45, 0, -1.3], [1.45, 0, 1.4], [-1.54, 0, 1.4], [-1.54, 0, -1.3]]} color={new THREE.Color(4, 2.2, 0.6)} lineWidth={2.2} transparent toneMapped={false} />
    </group>
    <mesh ref={rays} position={[0, 1.8, -0.75]} renderOrder={-1}>
      <planeGeometry args={[12, 12]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`
          varying vec2 vUv; uniform float uStrength; uniform float uTime;
          void main(){
            vec2 p=(vUv-.5)*2.; float r=length(p); float a=atan(p.y,p.x);
            float streak=pow(max(0.,sin(a*13.+sin(a*7.)*1.8+uTime*.12)),24.);
            float rays=streak*exp(-r*4.)*smoothstep(.035,.13,r);
            float halo=exp(-r*r*65.)*.45;
            float alpha=(rays+halo)*uStrength*(1.-smoothstep(.65,1.,r));
            if(alpha < .001) discard;
            gl_FragColor=vec4(vec3(3.8,2.4,.85),alpha);
          }`} />
    </mesh>
    <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, -1.01, 0]} visible={false}>
      <ringGeometry args={[0.94, 1, 128]} />
      <meshBasicMaterial color={[5, 3, 1]} transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <points ref={dust} visible={false} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={[4, 2.7, 1]} size={0.025} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  </>;
}
