import * as THREE from "three";

export type GoldUniforms = {
  sweep: { value: number };
  reveal: { value: number };
  rim: { value: number };
};

// Keep the original artwork and physically lit material. Only the CD body gets
// this finish; the clear hub and jewel-case plastics retain their own materials.
export function applyGoldFinish(material: THREE.MeshPhysicalMaterial, geometry: THREE.BufferGeometry, uniforms: GoldUniforms) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const extent = box.getSize(new THREE.Vector3());
  const radius = Math.max(extent.x, extent.y) * .5;
  material.metalness = .32;
  material.roughness = .21;
  material.clearcoat = .85;
  material.clearcoatRoughness = .13;
  material.iridescence = .42;
  material.iridescenceIOR = 1.32;
  material.iridescenceThicknessRange = [180, 330];
  material.onBeforeCompile = shader => {
    shader.uniforms.uGoldSweep = uniforms.sweep;
    shader.uniforms.uGoldReveal = uniforms.reveal;
    shader.uniforms.uGoldRim = uniforms.rim;
    shader.uniforms.uGoldCenter = { value: center };
    shader.uniforms.uGoldRadius = { value: Math.max(radius, .0001) };
    shader.vertexShader = "uniform vec3 uGoldCenter; uniform float uGoldRadius; varying vec3 vGoldLocal; varying vec3 vGoldX; varying vec3 vGoldY;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvGoldLocal=(position-uGoldCenter)/uGoldRadius; vGoldX=normalize(normalMatrix*vec3(1.,0.,0.)); vGoldY=normalize(normalMatrix*vec3(0.,1.,0.));");
    shader.fragmentShader = "uniform float uGoldSweep,uGoldReveal,uGoldRim; varying vec3 vGoldLocal; varying vec3 vGoldX; varying vec3 vGoldY;\n" +
      shader.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        vec2 p=vGoldLocal.xy;
        float radial=length(p);
        vec3 viewDirection=normalize(vViewPosition);
        float facing=clamp(abs(dot(normal,viewDirection)),0.,1.);
        float fresnel=pow(1.-facing,3.);
        // The highlight moves with the viewing angle, not a time-driven stripe.
        float viewShift=dot(viewDirection,normalize(vGoldX))*3.5+dot(viewDirection,normalize(vGoldY))*.8;
        float band=exp(-pow((p.x+p.y*.36-viewShift+.35)*5.5,2.));
        float innerMask=smoothstep(.29,.39,radial);
        float faceMask=innerMask*(1.-smoothstep(.94,1.,radial));
        vec3 gold=vec3(1.,.61,.19);
        vec3 patina=vec3(.16,.5,.3);
        vec3 foilTint=mix(gold,patina,smoothstep(.25,.65,abs(p.x+p.y*.36-viewShift+.35))*.35);
        float edge=smoothstep(.9,.97,radial)*(1.-smoothstep(1.,1.035,radial));
        float arc=.3+.7*pow(max(0.,dot(normalize(p+vec2(.0001)),normalize(vec2(-.4,.8)))),5.);
        // View-dependent reflection remains, but the timed green tint stops.
        float reflection=pow(max(0.,dot(normal,normalize(viewDirection+vec3(-.45,.6,1.)))),42.);
        reflectedLight.indirectSpecular += foilTint*band*faceMask*(.12+uGoldReveal*.38)*(.35+reflection);
        totalEmissiveRadiance += gold*edge*arc*uGoldRim*.22;
        reflectedLight.indirectSpecular += gold*faceMask*(fresnel*.06+reflection*.04);
      `);
  };
  material.customProgramCacheKey = () => "monkey-aged-gold-v3";
}
