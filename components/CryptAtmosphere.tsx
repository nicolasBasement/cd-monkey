"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smooth } from "./motion";

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise2(p)*.57+noise2(p*2.1)*.28+noise2(p*4.3)*.15;}
`;

// Soft procedural fog and a tapered shaft, not a rectangular image overlay.
export default function CryptAtmosphere({ time, reduced }: { time: { current: number }; reduced: boolean }) {
  const fog = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => { const object = new THREE.Object3D(); object.position.set(0, .8, 0); return object; }, []);
  const fogUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: .35 } }), []);
  const beamUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), []);
  useFrame(({ camera, clock }) => {
    const t = time.current;
    const enter = smooth(t / 1.5);
    const clear = smooth((t - 4.2) / 1.9);
    fogUniforms.uTime.value = reduced ? 0 : clock.elapsedTime * .16;
    fogUniforms.uOpacity.value = reduced ? 0 : .4 * (1 - clear);
    beamUniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    beamUniforms.uOpacity.value = reduced ? .12 : enter * (.5 - clear * .4);
    if (fog.current) {
      fog.current.quaternion.copy(camera.quaternion);
      fog.current.visible = !reduced && clear < 1;
      const material = fog.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = fogUniforms.uTime.value;
      material.uniforms.uOpacity.value = fogUniforms.uOpacity.value;
    }
    if (beam.current) {
      beam.current.quaternion.copy(camera.quaternion);
      const material = beam.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = beamUniforms.uTime.value;
      material.uniforms.uOpacity.value = beamUniforms.uOpacity.value;
    }
    if (light.current) light.current.intensity = 4 + enter * 26;
  });
  return <>
    <primitive object={target} />
    <spotLight ref={light} position={[-3.5, 7, 3]} target={target} angle={.35} penumbra={.85} decay={1} distance={20} color="#ffe4af" />
    <mesh ref={beam} position={[0, 2.8, -1.5]} renderOrder={-2}>
      <planeGeometry args={[8, 10]} />
      <shaderMaterial uniforms={beamUniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} vertexShader={vertex}
        fragmentShader={`varying vec2 vUv; uniform float uTime,uOpacity; ${noise}
        void main(){
          float center=.22+(1.-vUv.y)*.38;
          float width=mix(.19,.025,vUv.y);
          float shaft=1.-smoothstep(width*.25,width,abs(vUv.x-center));
          float edge=smoothstep(0.,.18,vUv.y)*(1.-smoothstep(.88,1.,vUv.y));
          float grain=fbm(vec2(vUv.x*18.,vUv.y*8.-uTime*.06));
          vec2 cells=vec2(vUv.x*70.,vUv.y*100.-uTime*.3);
          float mote=pow(max(0.,1.-length(fract(cells)-.5)*3.),8.)*step(.965,hash(floor(cells)));
          float alpha=shaft*edge*uOpacity*(.35+grain*.45+mote*3.);
          if(alpha<.001)discard;
          gl_FragColor=vec4(vec3(1.25,1.12,.77),alpha);
        }`} />
    </mesh>
    <mesh ref={fog} position={[0, -.55, 1]} renderOrder={2}>
      <planeGeometry args={[11, 3.2]} />
      <shaderMaterial uniforms={fogUniforms} transparent depthWrite={false} vertexShader={vertex}
        fragmentShader={`varying vec2 vUv; uniform float uTime,uOpacity; ${noise}
        void main(){
          vec2 p=vUv*vec2(6.,3.);
          float cloud=fbm(p+vec2(uTime,fbm(p-uTime*.4)));
          float edge=smoothstep(0.,.18,vUv.x)*(1.-smoothstep(.82,1.,vUv.x))*smoothstep(0.,.25,vUv.y)*(1.-smoothstep(.4,1.,vUv.y));
          edge*=1.-smoothstep(.35,1.,length((vUv-.5)*vec2(1.8,1.5)));
          float alpha=smoothstep(.25,.8,cloud)*edge*uOpacity;
          if(alpha<.001)discard;
          gl_FragColor=vec4(.3,.45,.46,alpha);
        }`} />
    </mesh>
  </>;
}
