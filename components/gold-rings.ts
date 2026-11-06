import * as THREE from "three";

// Shared falloff for E only: feather the radial edge and keep effects out of UI.
export function softenGoldRing(material: THREE.MeshBasicMaterial, viewportHeight: { value: number }) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldViewportHeight = viewportHeight;
    shader.vertexShader = "varying vec2 vGoldRingUv;\n" + shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvGoldRingUv=uv;");
    shader.fragmentShader = "varying vec2 vGoldRingUv; uniform float uGoldViewportHeight;\n" + shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float radius=length(vGoldRingUv-.5)*2.;
      float edge=smoothstep(.94,.965,radius)*(1.-smoothstep(.975,1.,radius));
      float screenFade=smoothstep(.14,.27,gl_FragCoord.y/max(1.,uGoldViewportHeight));
      diffuseColor.a*=edge*screenFade;
    `);
  };
  material.customProgramCacheKey = () => "gold-soft-rings-v1";
}
