"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { MURRAY_COUNT, murrayParticle } from "./murray-motion";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`;
const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uJaw;
  varying vec2 vUv;
  vec4 skull(vec2 localUv) {
    if(any(lessThan(localUv, vec2(0.))) || any(greaterThan(localUv, vec2(1.)))) return vec4(0.);
    vec2 uv = vec2(48./256., 41./281.) + localUv * vec2(142./256., 190./281.);
    vec4 pixel = texture2D(uMap, uv);
    float chroma = max(pixel.r, pixel.g) - pixel.b;
    float matte = 1. - smoothstep(.045, .19, chroma);
    float gray = dot(pixel.rgb, vec3(.2126, .7152, .0722));
    return vec4(vec3(gray) * vec3(1., .98, .90), pixel.a * matte);
  }
  void main() {
    // Separate the lower jaw in UV space; preserve the supplied screenshot.
    const float hinge = .226;
    vec4 head = skull(vUv);
    head.a *= step(hinge, vUv.y);
    vec2 jawUv = vUv + vec2(0., uJaw);
    vec4 jaw = skull(jawUv);
    jaw.a *= 1. - step(hinge, jawUv.y);
    float alpha = jaw.a + head.a * (1. - jaw.a);
    vec3 color = (jaw.rgb * jaw.a + head.rgb * head.a * (1. - jaw.a)) / max(alpha, .001);
    alpha *= uOpacity;
    if(alpha < .008) discard;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function MurrayParticles({ time, anchor, reduced }: {
  time: { current: number }; anchor: THREE.Vector3; reduced: boolean;
}) {
  const texture = useTexture("/textures/murray-reference.png");
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const materials = useMemo(() => Array.from({ length: MURRAY_COUNT }, () => new THREE.ShaderMaterial({
    uniforms: { uMap: { value: texture }, uOpacity: { value: 0 }, uJaw: { value: 0 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, toneMapped: false,
  })), [texture]);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return () => materials.forEach(material => material.dispose());
  }, [texture, materials]);

  useFrame(({ camera }) => {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    camera.getWorldDirection(direction);
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = murrayParticle(time.current, i);
      mesh.visible = !reduced && p.visible;
      if (!mesh.visible) return;
      mesh.position.copy(anchor).addScaledVector(right, p.x).addScaledVector(up, p.y).addScaledVector(direction, -0.25);
      // Keep the small apparitions away from the viewport edges and controls.
      screen.copy(mesh.position).project(camera);
      screen.x = THREE.MathUtils.clamp(screen.x, -0.82, 0.82);
      screen.y = THREE.MathUtils.clamp(screen.y, -0.45, 0.66);
      mesh.position.copy(screen.unproject(camera));
      mesh.quaternion.copy(camera.quaternion);
      mesh.rotateZ(p.rotation);
      mesh.scale.set(p.size * 142 / 190, p.size, 1);
      materials[i].uniforms.uOpacity.value = p.opacity;
      materials[i].uniforms.uJaw.value = p.jaw;
    });
  });
  return <group>{materials.map((material, i) =>
    <mesh key={i} ref={mesh => { meshes.current[i] = mesh; }} material={material} visible={false} raycast={() => {}}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )}</group>;
}
