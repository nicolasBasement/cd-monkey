"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import { cryptAtmosphere } from "./motion";

// Integrate actual world-space density along the camera ray. Scene depth stops
// scattering at the CD/case instead of drawing a luminous billboard over them.
export default function CryptAtmosphere({ time, reduced, anchor }: {
  anchor: THREE.Vector3; time: { current: number }; reduced: boolean;
}) {
  const volume = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const light = useRef<THREE.SpotLight>(null);
  const { size } = useThree();
  const width = size.width < 700 ? 512 : 768;
  const height = Math.max(1, Math.round(width * size.height / size.width));
  const depth = useMemo(() => new THREE.DepthTexture(width, height, THREE.UnsignedShortType), [width, height]);
  useEffect(() => () => depth.dispose(), [depth]);
  const buffer = useFBO(width, height, { depthTexture: depth });
  const source = useMemo(() => new THREE.Vector3(-3.5, 7, 3), []);
  const target = useMemo(() => new THREE.Object3D(), []);
  const uniforms = useMemo(() => ({
    uDepth: { value: depth }, uInvProjection: { value: new THREE.Matrix4() },
    uCameraWorld: { value: new THREE.Matrix4() }, uEye: { value: new THREE.Vector3() },
    uSource: { value: source }, uTarget: { value: new THREE.Vector3() },
    uTime: { value: 0 }, uBeam: { value: 0 }, uFog: { value: 0 }, uFocus: { value: 0 },
  }), [depth, source]);
  useFrame(({ camera, clock, gl, scene }) => {
    if (!volume.current) return;
    const mood = cryptAtmosphere(time.current, reduced);
    target.position.set(0, .3, 0).lerp(anchor, mood.track);
    target.updateMatrixWorld();
    if (light.current) {
      light.current.intensity = 3 + mood.light * 11;
      light.current.angle = .45 - mood.focus * .1;
    }
    const u = volume.current.material.uniforms;
    u.uDepth.value = depth;
    u.uInvProjection.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);
    u.uEye.value.copy(camera.position);
    u.uTarget.value.copy(target.position);
    u.uTime.value = reduced ? 0 : clock.elapsedTime * .12;
    u.uBeam.value = mood.beam;
    u.uFog.value = mood.fog;
    u.uFocus.value = mood.focus;
    // Hide only this volume in the depth prepass: no texture feedback, and
    // transparent materials keep their original depth-write behaviour.
    const previous = gl.getRenderTarget();
    volume.current.visible = false;
    try {
      gl.setRenderTarget(buffer);
      gl.clear();
      gl.render(scene, camera);
    } finally {
      gl.setRenderTarget(previous);
      volume.current.visible = true;
    }
  }, -1);
  return <>
    <primitive object={target} />
    <spotLight ref={light} position={source} target={target} penumbra={1} decay={1} distance={20} color="#eddbb6" />
    <mesh ref={volume} frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} depthTest={false} toneMapped={false}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`}
        fragmentShader={`
          varying vec2 vUv;
          uniform sampler2D uDepth;
          uniform mat4 uInvProjection,uCameraWorld;
          uniform vec3 uEye,uSource,uTarget;
          uniform float uTime,uBeam,uFog,uFocus;
          float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
          float noise3(vec3 p){
            vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
            return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                           mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                           mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
          }
          vec3 worldAt(float z){
            vec4 view=uInvProjection*vec4(vUv*2.-1.,z*2.-1.,1.);
            return (uCameraWorld*vec4(view.xyz/view.w,1.)).xyz;
          }
          void main(){
            vec3 ray=normalize(worldAt(1.)-uEye);
            float depth=texture2D(uDepth,vUv).x;
            float limit=min(19.,length(worldAt(depth)-uEye));
            float stepSize=limit/32.;
            vec3 axis=normalize(uTarget-uSource);
            vec3 scatter=vec3(0.);
            float transmittance=1.;
            // Stable sub-pixel jitter breaks up marching bands without flicker.
            float jitter=hash(vec3(gl_FragCoord.xy,4.));
            for(int i=0;i<32;i++){
              float distance=(float(i)+jitter)*stepSize;
              vec3 p=uEye+ray*distance;
              vec3 q=p-uSource;
              float along=dot(q,axis);
              float radius=.25+max(along,0.)*mix(.17,.13,uFocus);
              float radial=length(q-axis*along)/radius;
              vec3 drift=vec3(uTime*.35,uTime*.08,-uTime*.22);
              float n=noise3(p*.75+drift)*.7+noise3(p*1.7-drift)*.3;
              float shaft=exp(-radial*radial*2.6)*smoothstep(0.,1.,along)*(1.-smoothstep(7.,12.,along));
              shaft*=.3+.7*n;
              // Irregular, low world-space banks: no screen-aligned fog strips.
              float bank=exp(-pow((p.y+.6+noise3(p*.4+drift)*.6)/.75,2.));
              bank*=exp(-dot(p.xz,p.xz)*.045)*smoothstep(.32,.75,n);
              float haze=bank*uFog*.12;
              float lit=shaft*uBeam*.32;
              float density=haze+lit;
              float alpha=1.-exp(-density*stepSize);
              vec3 tint=mix(vec3(.19,.31,.33),vec3(.95,.87,.67),lit/max(density,.0001));
              scatter+=transmittance*alpha*tint;
              transmittance*=1.-alpha;
            }
            float alpha=1.-transmittance;
            if(alpha<.0005)discard;
            gl_FragColor=vec4(scatter/max(alpha,.0001),alpha);
          }`} />
    </mesh>
  </>;
}
