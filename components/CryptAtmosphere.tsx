"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cryptAtmosphere } from "./motion";

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise2(p)*.57+noise2(p*2.1)*.28+noise2(p*4.3)*.15;}
`;

// Soft procedural fog and a tapered shaft, not a rectangular image overlay.
export default function CryptAtmosphere({ time, reduced, anchor }: { anchor: THREE.Vector3; time: { current: number }; reduced: boolean }) {
  const fog = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => { const object = new THREE.Object3D(); object.position.set(0, .8, 0); return object; }, []);
  const fogLayers = useMemo(() => [-1, 0, 1].map((side, i) => ({
    position: [side * 2, -.65 + i * .12, -.7 + i * .85] as [number, number, number],
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: i * 5.7 } },
  })), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const beamUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uFocus: { value: 0 } }), []);
  useFrame(({ camera, clock }) => {
    const t = time.current;
    const mood = cryptAtmosphere(t, reduced);
    if (fog.current) {
      fog.current.visible = mood.fog > .001;
      fog.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
        mesh.quaternion.copy(camera.quaternion);
        mesh.position.x = fogLayers[i].position[0] + (i % 2 ? -1 : 1) * mood.clear * .85;
        mesh.material.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime * .075;
        mesh.material.uniforms.uOpacity.value = mood.fog * (i === 1 ? .85 : 1);
      });
    }
    if (beam.current) {
      beam.current.quaternion.copy(camera.quaternion);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      camera.getWorldDirection(forward);
      // Settle the shaft behind the artifact rather than shining across its label.
      beam.current.position.set(0, 2.8, -1.5);
      forward.multiplyScalar(.9).add(anchor).addScaledVector(up, 2.6);
      beam.current.position.lerp(forward, mood.focus);
      const material = beam.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
      material.uniforms.uOpacity.value = mood.beam;
      material.uniforms.uFocus.value = mood.focus;
    }
    target.position.set(0, .3, 0).lerp(anchor, mood.track);
    target.updateMatrixWorld();
    if (light.current) {
      light.current.intensity = 3 + mood.light * 14;
      light.current.angle = .4 - mood.focus * .12;
    }
  });
  return <>
    <primitive object={target} />
    <spotLight ref={light} position={[-3.5, 7, 3]} target={target} angle={.35} penumbra={1} decay={1} distance={20} color="#ffe4af" />
    <mesh ref={beam} position={[0, 2.8, -1.5]} renderOrder={-2}>
      <planeGeometry args={[8, 10]} />
      <shaderMaterial uniforms={beamUniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} vertexShader={vertex}
        fragmentShader={`varying vec2 vUv; uniform float uTime,uOpacity,uFocus; ${noise}
        void main(){
          float center=.22+(1.-vUv.y)*.38;
          float width=mix(.19,.04,vUv.y)*mix(1.,.72,uFocus);
          float distanceToAxis=(vUv.x-center)/width;
          float shaft=exp(-distanceToAxis*distanceToAxis*2.8);
          float wisps=.8+.2*sin(vUv.x*94.+fbm(vUv*6.)*3.);
          float edge=smoothstep(.05,.42,vUv.y)*(1.-smoothstep(.78,1.,vUv.y));
          float grain=fbm(vec2(vUv.x*18.,vUv.y*8.-uTime*.06));
          vec2 cells=vec2(vUv.x*70.,vUv.y*100.-uTime*.3);
          float mote=pow(max(0.,1.-length(fract(cells)-.5)*3.),8.)*step(.965,hash(floor(cells)));
          float alpha=shaft*edge*uOpacity*(.12+grain*.2+mote*.8)*wisps;
          if(alpha<.001)discard;
          gl_FragColor=vec4(vec3(1.08,1.,.8),alpha);
        }`} />
    </mesh>
    <group ref={fog}>
      {fogLayers.map((layer, index) => <mesh key={index} position={layer.position} renderOrder={index}>
        <planeGeometry args={[7.5, 2.8]} />
        <shaderMaterial uniforms={layer.uniforms} transparent depthWrite={false} vertexShader={vertex}
          fragmentShader={`varying vec2 vUv; uniform float uTime,uOpacity,uSeed; ${noise}
          void main(){
            vec2 p=vUv*vec2(4.,3.)+uSeed;
            vec2 warp=vec2(fbm(p+uTime*.3),fbm(p*1.3-uTime*.2));
            float cloud=fbm(p+warp*1.5+vec2(uTime,0.));
            // Offset elliptical wisps avoid a common horizontal edge across layers.
            vec2 q=vUv-vec2(.5,.48+.09*sin(uSeed));
            float envelope=exp(-q.x*q.x*14.-q.y*q.y*28.);
            float edge=smoothstep(0.,.15,vUv.x)*(1.-smoothstep(.85,1.,vUv.x))*smoothstep(0.,.2,vUv.y)*(1.-smoothstep(.75,1.,vUv.y));
            float alpha=smoothstep(.36,.8,cloud)*envelope*edge*uOpacity;
            if(alpha<.001)discard;
            gl_FragColor=vec4(.22,.34,.36,alpha);
          }`} />
      </mesh>)}
    </group>
  </>;
}
