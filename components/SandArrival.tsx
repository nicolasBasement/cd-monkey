"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sandGrain, SAND_DURATION, SAND_TAIL } from "./sand-material";

const COUNT = 220;
function grainOpacity(shader: Parameters<THREE.PointsMaterial["onBeforeCompile"]>[0]) {
  shader.vertexShader = "attribute float sandAlpha; varying float vSandAlpha;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvSandAlpha = sandAlpha;");
  shader.fragmentShader = "varying float vSandAlpha;\n" + shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vSandAlpha;");
}
export default function SandArrival({ bounds, time, reduced }: { bounds: THREE.Box3; time: { current: number }; reduced: boolean }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const alphas = useMemo(() => new Float32Array(COUNT), []);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  useFrame(() => {
    if (!points.current) return;
    const elapsed = time.current;
    points.current.visible = !reduced && elapsed > 0 && elapsed < SAND_DURATION + SAND_TAIL;
    if (!points.current.visible) return;
    for (let i = 0; i < COUNT; i++) {
      const seed = (i * 0.61803398875) % 1;
      const grain = sandGrain(elapsed, seed);
      alphas[i] = grain.alpha;
      const angle = i * 2.39996;
      positions[i * 3] = bounds.min.x + size.x * (0.5 + Math.cos(angle) * (grain.radius * (0.6 + seed * 0.4)));
      positions[i * 3 + 1] = bounds.min.y + size.y * grain.height;
      positions[i * 3 + 2] = bounds.min.z + size.z * (0.5 + Math.sin(angle) * (grain.radius * (0.6 + seed * 0.4)));
    }
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.geometry.attributes.sandAlpha.needsUpdate = true;
  }, -1);
  return <points ref={points} frustumCulled={false} visible={false} raycast={() => {}}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      <bufferAttribute attach="attributes-sandAlpha" args={[alphas, 1]} />
    </bufferGeometry>
    <pointsMaterial color="#d9ba77" size={0.025} transparent opacity={0.7} depthWrite={false} toneMapped onBeforeCompile={grainOpacity} customProgramCacheKey={() => "sand-grains-v2"} />
  </points>;
}
