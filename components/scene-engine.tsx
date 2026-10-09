"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { surfaceTexture, mountainGeometry } from "../lib/materials";
import {
  localHour,
  random,
  solarState,
  type Quality,
  type SceneId,
} from "../lib/environment";

declare global {
  interface Window {
    __livingScreen?: {
      fps: number;
      geometries: number;
      textures: number;
      calls: number;
      triangles: number;
      dpr: number;
      scene: SceneId;
      hour: number;
      frames: number;
      paused: boolean;
      solar: ReturnType<typeof solarState>;
    };
  }
}
const unitBox = new THREE.BoxGeometry();
const roundedBox = new RoundedBoxGeometry(1, 1, 1, 3, 0.12);
const leafSphere = new THREE.SphereGeometry(1, 12, 8);
const vshader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyShader = `varying vec2 vUv; uniform float day; uniform float warm; uniform float time; void main(){vec3 bottom=mix(vec3(.035,.055,.11),vec3(.72,.81,.77),day); bottom=mix(bottom,vec3(.96,.56,.29),warm*.65);vec3 top=mix(vec3(.008,.018,.055),vec3(.24,.47,.62),day);vec3 col=mix(bottom,top,smoothstep(.05,.95,vUv.y));float haze=sin(vUv.x*12.+time*.006)*sin(vUv.y*18.+time*.004)*.013;gl_FragColor=vec4(col+haze,1.);}`;
const waterShader = `varying vec2 vUv; uniform float time; uniform float day;void main(){float wave=sin(vUv.y*240.+sin(vUv.x*26.+time*.12)*2.+time*.4)*.5+.5;float rip=pow(wave,18.);vec3 c=mix(vec3(.015,.055,.07),vec3(.29,.49,.47),day); c+=rip*.10*day; c+=sin(vUv.y*60.+time*.1)*.025;gl_FragColor=vec4(c,1.);}`;
const nebulaShader = `varying vec2 vUv;uniform float time;void main(){vec2 p=vUv*2.-1.;float a=atan(p.y,p.x);float r=length(p);float fog=sin(p.x*7.+sin(p.y*5.+time*.018))*sin(p.y*6.-time*.012)*.5+.5;float f=pow(fog,2.)*smoothstep(1.,.1,r)*.35;vec3 c=mix(vec3(.10,.18,.28),vec3(.33,.15,.32),sin(a*2.+r*4.+time*.013)*.5+.5);gl_FragColor=vec4(c,f);}`;
function Box({
  position,
  scale,
  color,
  roughness = 0.8,
  texture,
  soft = false,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  roughness?: number;
  texture?: THREE.Texture;
  soft?: boolean;
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      geometry={soft ? roundedBox : unitBox}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} map={texture} />
    </mesh>
  );
}
function Cylinder({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Tree({
  position,
  size = 1,
  seed = 1,
}: {
  position: [number, number, number];
  size?: number;
  seed?: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.rotation.z =
        Math.sin(clock.elapsedTime * 0.23 + seed) * 0.018;
  });
  return (
    <group position={position} scale={size}>
      <Cylinder
        position={[0, 1.4, 0]}
        args={[0.09, 0.15, 2.8, 6]}
        color="#4b4936"
      />
      <group ref={group}>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[1.25, 2.5, 7]} />
          <meshStandardMaterial color="#344e40" flatShading />
        </mesh>
        <mesh position={[0, 4, 0]} castShadow>
          <coneGeometry args={[0.9, 2.1, 7]} />
          <meshStandardMaterial color="#3c5949" flatShading />
        </mesh>
        <mesh position={[0, 4.9, 0]}>
          <coneGeometry args={[0.58, 1.8, 7]} />
          <meshStandardMaterial color="#466251" flatShading />
        </mesh>
      </group>
    </group>
  );
}
function Clouds() {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const rand = random(18);
    return Array.from({ length: 18 }, () => ({
      x: (rand() - 0.5) * 75,
      y: 10 + rand() * 7,
      z: -40 - rand() * 12,
      s: 2 + rand() * 4,
    }));
  }, []);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.position.x = Math.sin(clock.elapsedTime * 0.007) * 8;
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, p.y, p.z]}
          scale={[p.s * 2, p.s * 0.23, p.s * 0.65]}
          geometry={leafSphere}
        >
          <meshBasicMaterial
            color="#e7e9df"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function Forest() {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const trees = useMemo(() => {
    const r = random(63);
    return Array.from({ length: 38 }, () => {
      const x = (r() - 0.5) * 75;
      return {
        x: x < 0 ? x - 8 : x + 8,
        z: -17 - r() * 22,
        s: 0.5 + r() * 0.9,
      };
    });
  }, []);
  const object = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    meshes.current.forEach((mesh, level) => {
      if (!mesh) return;
      trees.forEach((p, i) => {
        object.position.set(p.x, -0.3 + [1.4, 3, 4, 4.9][level] * p.s, p.z);
        object.rotation.set(
          0,
          0,
          level === 0 ? 0 : Math.sin(clock.elapsedTime * 0.23 + i) * 0.015,
        );
        object.scale.set(
          p.s * [1, 1.25, 0.9, 0.58][level],
          p.s * [2.8, 2.5, 2.1, 1.8][level],
          p.s * [1, 1.25, 0.9, 0.58][level],
        );
        object.updateMatrix();
        mesh.setMatrixAt(i, object.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <group>
      {["#4b4936", "#344e40", "#3c5949", "#466251"].map((color, i) => (
        <instancedMesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          args={[undefined, undefined, 38]}
          castShadow={i > 0}
          frustumCulled={false}
        >
          {i === 0 ? (
            <cylinderGeometry args={[0.09, 0.15, 1, 6]} />
          ) : (
            <coneGeometry args={[1, 1, 7]} />
          )}
          <meshStandardMaterial color={color} flatShading />
        </instancedMesh>
      ))}
    </group>
  );
}
function Landscape() {
  const mountains = useMemo(() => mountainGeometry(), []);
  useEffect(() => () => mountains.dispose(), [mountains]);
  const water = useRef<THREE.ShaderMaterial>(null);
  const sky = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, day: { value: 1 }, warm: { value: 0 } }),
    [],
  );
  const wu = useMemo(() => ({ time: { value: 0 }, day: { value: 1 } }), []);
  useFrame(({ clock }) => {
    const s = window.__livingScreen?.solar ?? solarState(localHour());
    if (sky.current) {
      sky.current.uniforms.time.value = clock.elapsedTime;
      sky.current.uniforms.day.value = s.daylight;
      sky.current.uniforms.warm.value = s.warmth;
    }
    if (water.current) {
      water.current.uniforms.time.value = clock.elapsedTime;
      water.current.uniforms.day.value = s.daylight;
    }
  });

  return (
    <group>
      <mesh position={[0, 16, -65]}>
        <planeGeometry args={[180, 70]} />
        <shaderMaterial
          ref={sky}
          vertexShader={vshader}
          fragmentShader={skyShader}
          uniforms={uniforms}
          depthWrite={false}
        />
      </mesh>
      <Clouds />
      <mesh geometry={mountains} receiveShadow>
        <meshStandardMaterial color="#81948a" roughness={1} />
      </mesh>
      <mesh position={[0, -0.36, -26]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 90]} />
        <meshStandardMaterial color="#66725a" />
      </mesh>
      <mesh position={[0, -0.29, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 46]} />
        <shaderMaterial
          ref={water}
          uniforms={wu}
          vertexShader={vshader}
          fragmentShader={waterShader}
        />
      </mesh>
      <Forest />
      <Tree position={[-11, -0.3, -11]} size={1.9} />
      <Tree position={[12, -0.3, -14]} size={1.7} />
    </group>
  );
}
function Plant({
  position,
  size = 1,
}: {
  position: [number, number, number];
  size?: number;
}) {
  const g = useRef<THREE.Group>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < 18; i++) {
      const index = Math.floor(i / 2);
      const a = index * 2.4;
      const right = i % 2 === 0;
      const x = right ? 0.25 : -0.18;
      const y = right ? 1.15 + (index % 3) * 0.3 : 1.55 + (index % 2) * 0.25;
      o.position.set(Math.cos(a) * x, y, -Math.sin(a) * x);
      o.rotation.set(0, a, right ? -0.7 : 0.5);
      o.scale.set(right ? 0.18 : 0.17, right ? 0.55 : 0.45, 0.06);
      o.updateMatrix();
      leaves.current?.setMatrixAt(i, o.matrix);
      c.set(i % 3 ? "#51634a" : "#3b503e");
      leaves.current?.setColorAt(i, c);
    }
    if (leaves.current) leaves.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    if (g.current)
      g.current.rotation.z = Math.sin(clock.elapsedTime * 0.3) * 0.008;
  });
  return (
    <group position={position} scale={size}>
      <Cylinder
        position={[0, 0.35, 0]}
        args={[0.37, 0.26, 0.7, 18]}
        color="#918576"
      />
      <group ref={g}>
        <Cylinder
          position={[0, 1.15, 0]}
          args={[0.015, 0.025, 1.5, 6]}
          color="#475845"
        />
        <instancedMesh
          ref={leaves}
          args={[leafSphere, undefined, 18]}
          frustumCulled={false}
        >
          <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
      </group>
    </group>
  );
}
function Room() {
  const wood = useMemo(() => surfaceTexture("wood"), []);
  const fabric = useMemo(() => surfaceTexture("fabric"), []);
  useEffect(
    () => () => {
      wood.dispose();
      fabric.dispose();
    },
    [wood, fabric],
  );
  const lamp = useRef<THREE.PointLight>(null);
  const shade = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const night = (window.__livingScreen?.solar ?? solarState(localHour()))
      .night;
    if (lamp.current) lamp.current.intensity = night * 22 + 1;
    if (shade.current) shade.current.emissiveIntensity = night * 0.7 + 0.1;
  });
  return (
    <>
      <Landscape />
      <Box
        position={[0, -0.18, 3]}
        scale={[26, 0.25, 18]}
        texture={wood}
        color="#a49478"
      />
      <Box position={[-10, 3.5, 1]} scale={[0.4, 7, 14]} color="#b8b5a4" />
      <Box position={[10, 3.5, 1]} scale={[0.4, 7, 14]} color="#b8b5a4" />
      <Box position={[0, 7, 1]} scale={[20, 0.22, 14]} color="#b8b5a4" />
      <Box position={[0, 5.8, -4.7]} scale={[20, 2.4, 0.35]} color="#b7b1a0" />
      <Box position={[-8, 2.3, -4.7]} scale={[4, 4.6, 0.35]} color="#b7b1a0" />
      <Box position={[8, 2.3, -4.7]} scale={[4, 4.6, 0.35]} color="#b7b1a0" />
      <Box position={[0, 0.15, -4.5]} scale={[12, 0.3, 0.5]} color="#635542" />
      {[-6, -2, 2, 6].map((x) => (
        <Box
          key={x}
          position={[x, 2.5, -4.5]}
          scale={[0.11, 4.8, 0.16]}
          color="#3a3d33"
        />
      ))}
      <Box
        position={[0, 4.86, -4.5]}
        scale={[12, 0.11, 0.16]}
        color="#3a3d33"
      />
      <Box
        position={[-6.3, 2.45, -4.28]}
        scale={[0.35, 4.8, 0.3]}
        color="#6b5943"
      />
      <Box
        position={[6.3, 2.45, -4.28]}
        scale={[0.35, 4.8, 0.3]}
        color="#6b5943"
      />
      {[-6.8, 6.8].map((x) => (
        <group key={x}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh
              key={i}
              position={[x + (i - 4) * 0.11, 2.4, -4.05]}
              scale={[0.1, 4.8, 0.14]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshStandardMaterial color="#c3bcaa" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      <Box
        position={[0.3, 0.006, 2.3]}
        scale={[7.2, 0.035, 5.5]}
        texture={fabric}
        color="#c3bba7"
      />
      <group position={[5, 0, 1.6]} rotation={[0, -0.08, 0]}>
        <Box position={[0, 0.35, 0]} scale={[4.5, 0.5, 2.1]} color="#928d7c" />
        <Box
          position={[0, 0.67, -0.08]}
          scale={[4.45, 0.34, 1.85]}
          soft
          texture={fabric}
          color="#d0cbb8"
        />
        <Box
          position={[0, 1.12, -0.95]}
          scale={[4.5, 1.15, 0.3]}
          soft
          texture={fabric}
          color="#c1bba8"
        />
        {[-2.15, 2.15].map((x) => (
          <Box
            key={x}
            position={[x, 0.9, 0]}
            scale={[0.32, 0.85, 2.1]}
            soft
            texture={fabric}
            color="#c2bcaa"
          />
        ))}
        {[-1.4, 0, 1.4].map((x) => (
          <Box
            key={x}
            position={[x, 1.13, -0.68]}
            scale={[1.32, 0.85, 0.25]}
            soft
            texture={fabric}
            rotation={[-0.14, 0, 0]}
            color="#d4ceba"
          />
        ))}
        <Box
          position={[-1.5, 1.17, -0.44]}
          scale={[0.65, 0.68, 0.23]}
          soft
          texture={fabric}
          rotation={[-0.2, 0, 0.16]}
          color="#5e6855"
        />
        <Box
          position={[1.45, 1.17, -0.4]}
          scale={[0.72, 0.7, 0.23]}
          soft
          texture={fabric}
          rotation={[-0.2, 0, -0.14]}
          color="#a18a6d"
        />
        <Box
          position={[1.3, 0.87, 0.2]}
          scale={[0.85, 0.04, 1.8]}
          color="#7e8070"
        />
        {[-1.7, 1.7].flatMap((x) =>
          [-0.65, 0.65].map((z) => (
            <Cylinder
              key={`${x}${z}`}
              position={[x, 0.16, z]}
              args={[0.06, 0.05, 0.32, 8]}
              color="#4f493c"
            />
          )),
        )}
      </group>
      <group position={[-0.6, 0, 1.9]}>
        <Cylinder
          position={[0, 0.73, 0]}
          args={[1.6, 1.6, 0.13, 48]}
          color="#796044"
        />
        <Cylinder
          position={[0, 0.36, 0]}
          args={[0.6, 0.8, 0.72, 24]}
          color="#62513d"
        />
        <Box
          position={[0.4, 0.84, -0.25]}
          scale={[0.8, 0.08, 0.55]}
          color="#d0c7b3"
        />
        <Box
          position={[0.44, 0.91, -0.26]}
          scale={[0.72, 0.06, 0.5]}
          color="#5c645a"
        />
        <Cylinder
          position={[-0.55, 0.97, 0.13]}
          args={[0.13, 0.12, 0.3, 16]}
          color="#bdb9a6"
        />
        <Cylinder
          position={[-0.55, 1.125, 0.13]}
          args={[0.1, 0.1, 0.008, 16]}
          color="#504433"
        />
        <Cylinder
          position={[0.23, 0.92, 0.45]}
          args={[0.3, 0.2, 0.22, 24]}
          color="#8b846f"
        />
      </group>
      <group position={[-5, 0, 0.3]} rotation={[0, 0.4, 0]}>
        <Box position={[0, 0.65, 0]} scale={[1.8, 0.22, 1.7]} color="#a6926f" />
        <Box
          position={[0, 1.14, -0.65]}
          scale={[1.8, 1, 0.2]}
          color="#b3a17d"
        />
        {[-0.9, 0.9].map((x) => (
          <group key={x}>
            <Box
              position={[x, 0.9, 0]}
              scale={[0.12, 0.13, 1.7]}
              color="#665840"
            />
            <Box
              position={[x, 0.5, 0.5]}
              scale={[0.1, 1, 0.1]}
              color="#665840"
            />
            <Box
              position={[x, 0.5, -0.5]}
              scale={[0.1, 1, 0.1]}
              color="#665840"
            />
          </group>
        ))}
      </group>
      <Plant position={[-5.5, 0, -3.4]} size={1.5} />
      <Plant position={[7, 0, -3.3]} size={1.4} />
      <group position={[7.6, 0, 1]}>
        <Cylinder
          position={[0, 0.04, 0]}
          args={[0.38, 0.38, 0.08, 24]}
          color="#3e4138"
        />
        <Cylinder
          position={[0, 1.48, 0]}
          args={[0.025, 0.025, 2.9, 10]}
          color="#5b5443"
        />
        <mesh position={[0, 2.9, 0]}>
          <cylinderGeometry args={[0.4, 0.65, 0.6, 32, 1, true]} />
          <meshStandardMaterial
            ref={shade}
            color="#d8c8a7"
            emissive="#ffb354"
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight
          ref={lamp}
          position={[0, 2.65, 0]}
          color="#ffbd72"
          distance={8}
          decay={2}
        />
      </group>
      <group position={[-8, 0, -2]}>
        <Box
          position={[0, 0.68, 0]}
          scale={[1.6, 1.35, 0.65]}
          color="#72604b"
        />
        <Box position={[0, 1.4, 0]} scale={[1.7, 0.1, 0.72]} color="#857153" />
        <Plant position={[0, 1.45, 0]} size={0.48} />
      </group>
    </>
  );
}
function Galaxy() {
  const planetMap = useMemo(() => surfaceTexture("planet"), []);
  useEffect(() => () => planetMap.dispose(), [planetMap]);
  const group = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Group>(null);
  const nebula = useRef<THREE.ShaderMaterial>(null);
  const stars = useMemo(() => {
    const r = random(193);
    const a = new Float32Array(2200 * 3);
    for (let i = 0; i < a.length; i += 3) {
      a[i] = (r() - 0.5) * 120;
      a[i + 1] = (r() - 0.5) * 80;
      a[i + 2] = -r() * 100 - 8;
    }
    return a;
  }, []);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.rotation.z = t * 0.0009;
      group.current.position.x = Math.sin(t * 0.011) * 2;
      group.current.position.z = Math.sin(t * 0.008) * 4;
    }
    if (planet.current) {
      planet.current.rotation.y = t * 0.014;
      planet.current.rotation.z = 0.22 + Math.sin(t * 0.007) * 0.04;
    }
    if (nebula.current) nebula.current.uniforms.time.value = t;
  });
  return (
    <>
      <color attach="background" args={["#050812"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[-10, 7, 6]} color="#dac5ad" intensity={3} />
      <mesh position={[0, 5, -50]}>
        <planeGeometry args={[140, 100]} />
        <shaderMaterial
          ref={nebula}
          vertexShader={vshader}
          fragmentShader={nebulaShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <group ref={group}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.09}
            color="#dce9eb"
            transparent
            opacity={0.85}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      </group>
      <group ref={planet} position={[5, 3, -10]}>
        <mesh>
          <sphereGeometry args={[3.5, 48, 32]} />
          <meshStandardMaterial
            color="#c4ac88"
            roughness={0.92}
            map={planetMap}
          />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, (i - 6) * 0.43, 0]}
          >
            <torusGeometry
              args={[
                Math.sqrt(Math.max(0.1, 12.2 - Math.pow((i - 6) * 0.43, 2))),
                0.028,
                4,
                64,
              ]}
            />
            <meshStandardMaterial color={i % 2 ? "#6e655f" : "#b6a18b"} />
          </mesh>
        ))}
        <mesh rotation={[-1.12, 0.2, 0]}>
          <ringGeometry args={[4.4, 6.6, 96]} />
          <meshStandardMaterial
            color="#b6a58a"
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[-1.12, 0.2, 0]}>
          <ringGeometry args={[5.1, 5.18, 96]} />
          <meshBasicMaterial color="#070b13" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[-11, 5, -24]}>
        <sphereGeometry args={[1.4, 24, 16]} />
        <meshStandardMaterial color="#5b7479" roughness={0.9} />
      </mesh>
    </>
  );
}
function Nature() {
  return (
    <>
      <Landscape />
      <Tree position={[-7, 0, -2]} size={2.1} />
      <Tree position={[9, 0, -5]} size={1.8} />
      <mesh position={[-7, -0.15, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 32]} />
        <meshStandardMaterial color="#596548" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[-6 + Math.sin(i * 2.4) * 3, 0.06, -4 + i * 0.8]}
          scale={[0.4 + (i % 3) * 0.16, 0.24, 0.35]}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#7d8376" flatShading />
        </mesh>
      ))}
    </>
  );
}
function Runtime({
  scene,
  quality,
  hourOverride,
  onAdapt,
}: {
  scene: SceneId;
  quality: Quality;
  hourOverride: number | null;
  onAdapt: (n: number) => void;
}) {
  const { gl, camera, scene: world, advance } = useThree();
  const smoothed = useRef(solarState(hourOverride ?? localHour()));
  const elapsed = useRef(0);
  const count = useRef(0);
  const start = useRef(0);
  const light = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const base = useRef(new THREE.Vector3());
  const background = useRef(new THREE.Color());
  const dayColor = useMemo(() => new THREE.Color("#afc4bb"), []);
  const nightColor = useMemo(() => new THREE.Color("#364956"), []);
  const warmColor = useMemo(() => new THREE.Color("#efab76"), []);
  const sunColor = useMemo(() => new THREE.Color("#fff4d9"), []);
  useEffect(() => {
    const p =
      scene === "room"
        ? [7.8, 3.5, 10.8]
        : scene === "nature"
          ? [0, 2.3, 9]
          : [0, 1, 15];
    camera.position.set(p[0], p[1], p[2]);
    base.current.copy(camera.position);
    camera.lookAt(
      scene === "room" ? 0 : 0,
      scene === "room" ? 2 : scene === "nature" ? 2 : 1,
      scene === "galaxy" ? -10 : -12,
    );
  }, [camera, scene]);
  useEffect(() => {
    let id = 0;
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    let contextLost = false;
    const cap = quality === "low" ? 24 : 30;
    let animationTime = 0;
    let previousTime = performance.now();
    const loop = () => {
      if (!active || contextLost || document.hidden) return;
      id = requestAnimationFrame(() => {
        const now = performance.now();
        animationTime += Math.min((now - previousTime) / 1000, 0.1);
        previousTime = now;
        advance(animationTime);
        timer = setTimeout(
          loop,
          Math.max(0, 1000 / cap - (performance.now() - now) - 2),
        );
      });
    };
    const visibility = () => {
      clearTimeout(timer);
      cancelAnimationFrame(id);
      if (window.__livingScreen) window.__livingScreen.paused = document.hidden;
      if (!document.hidden) {
        start.current = performance.now();
        count.current = 0;
        previousTime = performance.now();
        loop();
      }
    };
    const lost = () => {
      contextLost = true;
      clearTimeout(timer);
      cancelAnimationFrame(id);
    };
    const restored = () => {
      contextLost = false;
      previousTime = performance.now();
      loop();
    };
    gl.domElement.addEventListener("webglcontextrestored", restored);
    gl.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visibility);
    loop();
    return () => {
      active = false;
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
      clearTimeout(timer);
      cancelAnimationFrame(id);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [gl, advance, quality]);
  useFrame((state, delta) => {
    elapsed.current = state.clock.elapsedTime;
    const hour = hourOverride ?? localHour();
    const target = solarState(hour);
    for (const key of [
      "daylight",
      "night",
      "warmth",
      "elevation",
      "twilight",
    ] as const)
      smoothed.current[key] = THREE.MathUtils.damp(
        smoothed.current[key],
        target[key],
        0.8,
        Math.min(delta, 0.1),
      );
    const solar = smoothed.current;
    if (scene !== "galaxy") {
      background.current.copy(nightColor).lerp(dayColor, solar.daylight);
      world.background = background.current;
      if (light.current) {
        light.current.intensity = 0.2 + solar.daylight * 2.6;
        light.current.position.set(
          Math.cos(((hour - 6) / 24) * Math.PI * 2) * 16,
          5 + Math.max(0, solar.elevation) * 16,
          -12,
        );
        light.current.color.copy(sunColor).lerp(warmColor, solar.warmth);
      }
      if (ambient.current)
        ambient.current.intensity = 0.18 + solar.daylight * 0.85;
    }
    camera.position.x =
      base.current.x + Math.sin(elapsed.current * 0.025) * 0.055;
    const now = performance.now();
    if (!start.current) start.current = now;
    count.current++;
    const previous = window.__livingScreen;
    window.__livingScreen = {
      fps: previous?.fps ?? 0,
      frames: (previous?.frames ?? 0) + 1,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      dpr: gl.getPixelRatio(),
      scene,
      hour,
      paused: false,
      solar,
    };
    if (now - start.current > 5000) {
      const fps = (count.current * 1000) / (now - start.current);
      window.__livingScreen.fps = Math.round(fps * 10) / 10;
      const minimumDpr = Math.min(0.5, 960 / window.innerWidth);
      if (quality === "auto" && fps < 22 && gl.getPixelRatio() > minimumDpr) {
        const n = Math.max(minimumDpr, gl.getPixelRatio() * 0.8);
        onAdapt(n);
      }
      start.current = now;
      count.current = 0;
    }
  });
  return (
    <>
      {scene !== "galaxy" && (
        <>
          <ambientLight ref={ambient} />
          <directionalLight
            ref={light}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-bias={-0.001}
          />
        </>
      )}
      {scene === "room" ? (
        <Room />
      ) : scene === "galaxy" ? (
        <Galaxy />
      ) : (
        <Nature />
      )}
    </>
  );
}
/** Remove native listeners before R3F deliberately disposes an old context. */
function ContextGuard({
  onLost,
  onRestore,
}: {
  onLost: () => void;
  onRestore: () => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", onRestore);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", onRestore);
    };
  }, [gl, onLost, onRestore]);
  return null;
}
class Boundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function SceneEngine({
  scene,
  quality,
  hourOverride,
  onStatus,
}: {
  scene: SceneId;
  quality: Quality;
  hourOverride: number | null;
  onStatus: (s: string) => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    const resize = () =>
      setDpr(
        Math.min(
          quality === "low" ? 0.65 : quality === "high" ? 1.25 : 1,
          window.devicePixelRatio,
          (quality === "high" ? 2560 : quality === "low" ? 1280 : 1920) /
            window.innerWidth,
        ),
      );
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [quality]);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    setSupported(!!gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  useEffect(() => {
    if (supported === false || failed) onStatus("Compatibility mode");
  }, [supported, failed, onStatus]);
  return (
    <div
      className={`scene-stage scene-${scene}`}
      aria-label={`${scene} animated environment`}
    >
      {(supported === false || failed) && (
        <div className="fallback-landscape">
          <div className="fallback-mountain" />
          <div className="fallback-water" />
          <p>
            This browser cannot render 3D. A gentle animated fallback is active.
          </p>
        </div>
      )}
      {supported && !failed && (
        <Boundary key={generation} onFail={() => setFailed(true)}>
          <Canvas
            key={generation}
            frameloop="never"
            dpr={dpr}
            shadows={quality === "high"}
            camera={{ fov: 45, near: 0.1, far: 200 }}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "low-power",
              stencil: false,
            }}
            onCreated={({ gl }) => gl.setClearColor("#192d36")}
          >
            <ContextGuard
              onLost={() => {
                setLost(true);
                onStatus("Restoring environment…");
              }}
              onRestore={() => {
                setLost(false);
                onStatus("Environment restored");
              }}
            />
            <Runtime
              scene={scene}
              quality={quality}
              hourOverride={hourOverride}
              onAdapt={(value) => {
                setDpr(value);
              }}
            />
          </Canvas>
        </Boundary>
      )}
      {lost && (
        <div className="recovery" role="status">
          <span className="status-dot" />
          Restoring your environment…
          <button
            ref={(node) => node?.focus()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key.startsWith("Arrow")) {
                event.stopPropagation();
                if (event.key.startsWith("Arrow")) event.preventDefault();
              }
            }}
            onClick={() => {
              setLost(false);
              setGeneration((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
