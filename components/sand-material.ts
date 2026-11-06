import * as THREE from "three";

export const SAND_DURATION = 1.3;
export function sandProgress(elapsed: number, reduced: boolean) {
  if (reduced) return 1;
  const t = Math.min(1, Math.max(0, elapsed / SAND_DURATION));
  // Zero velocity and acceleration at both ends, a faster middle passage.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const SAND_TAIL = 0.4;
export function sandGrain(elapsed: number, seed: number) {
  const birth = seed * 1.08;
  const lifetime = 0.38 + seed * 0.23;
  const age = Math.min(1, Math.max(0, (elapsed - birth) / lifetime));
  const gather = 1 - Math.pow(1 - Math.min(1, age / 0.38), 3);
  const fall = Math.max(0, (age - 0.3) / 0.7);
  return {
    height: ((seed * 7.31 + 0.17) % 1) + 0.09 * Math.sin(age * Math.PI) - fall * fall * 0.3,
    radius: 0.66 - gather * 0.2 + fall * 0.08,
    alpha: Math.min(1, age / 0.12) * Math.pow(1 - age, 0.65),
  };
}

// Coordinates are captured in the closed model's common space, not each mesh's UVs.
// Compose after foil/gold hooks so the original finishes survive the arrival.
export function applySandArrival(material: THREE.MeshPhysicalMaterial, matrix: THREE.Matrix4, bounds: THREE.Box3, progress: { value: number }) {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  const size = bounds.getSize(new THREE.Vector3()).max(new THREE.Vector3(0.0001, 0.0001, 0.0001));
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    Object.assign(shader.uniforms, {
      uSandProgress: progress, uSandMatrix: { value: matrix },
      uSandMin: { value: bounds.min.clone() }, uSandSize: { value: size },
    });
    shader.vertexShader = `uniform mat4 uSandMatrix; uniform vec3 uSandMin, uSandSize;
      varying vec3 vSandPosition;\n` + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vSandPosition = ((uSandMatrix * vec4(position, 1.0)).xyz - uSandMin) / uSandSize;`);
    shader.fragmentShader = `uniform float uSandProgress; varying vec3 vSandPosition;
      float sandHash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float sandNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(sandHash(i),sandHash(i+vec3(1,0,0)),f.x),mix(sandHash(i+vec3(0,1,0)),sandHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(sandHash(i+vec3(0,0,1)),sandHash(i+vec3(1,0,1)),f.x),mix(sandHash(i+vec3(0,1,1)),sandHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }\n` + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      float sandEdge = 1.0;
      if (uSandProgress < 1.0) {
        // Stationary 3D islands: no height threshold and no travelling scan plane.
        vec3 inkPosition = vSandPosition * vec3(4.5, 3.0, 4.5) + vec3(2.7, 5.1, 1.3);
        float islands = sandNoise(inkPosition);
        float fibers = sandNoise(inkPosition * 3.1);
        float grain = sandNoise(inkPosition * 9.0);
        float contour = islands * 0.76 + fibers * 0.19 + grain * 0.05;
        float localPace = mix(0.75, 1.45, sandNoise(inkPosition * 0.65 + vec3(8.3)));
        float inkProgress = pow(uSandProgress, localPace);
        sandEdge = mix(-0.08, 1.08, inkProgress) - contour;
        if (sandEdge < 0.0) discard;
      }`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      if (uSandProgress < 1.0) {
        float rim = 1.0-smoothstep(0.0,0.025,sandEdge);
        totalEmissiveRadiance += mix(vec3(0.32,0.65,0.28),vec3(1.5,0.88,0.26),0.85)*rim*0.4;
      }`);
  };
  material.customProgramCacheKey = () => previousKey + "-sand-islands-v2";
}
