"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import styles from "@/app/game/game.module.css";

const BOARD_SIZE = 8;
const HALF_BOARD = (BOARD_SIZE - 1) / 2;
const BOARD_TILES = Array.from(
  { length: BOARD_SIZE * BOARD_SIZE },
  (_, index) => ({
    x: index % BOARD_SIZE,
    z: Math.floor(index / BOARD_SIZE),
  }),
);

function Board() {
  return (
    <group>
      <mesh position={[0, -0.28, 0]} receiveShadow>
        <boxGeometry args={[BOARD_SIZE + 0.7, 0.42, BOARD_SIZE + 0.7]} />
        <meshStandardMaterial
          color="#13212b"
          metalness={0.65}
          roughness={0.45}
        />
      </mesh>

      {BOARD_TILES.map(({ x, z }) => (
        <mesh
          key={`${x}-${z}`}
          position={[x - HALF_BOARD, 0, z - HALF_BOARD]}
          receiveShadow
        >
          <boxGeometry args={[0.94, 0.2, 0.94]} />
          <meshStandardMaterial
            color={(x + z) % 2 === 0 ? "#354650" : "#2e3d47"}
            metalness={0.58}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function Robot() {
  return (
    <group position={[-0.5, 0.62, 1.5]}>
      <mesh castShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.58, 0.5, 0.6]} />
        <meshStandardMaterial
          color="#ed5a54"
          metalness={0.72}
          roughness={0.28}
        />
      </mesh>

      <mesh castShadow position={[0, 0.38, -0.02]}>
        <boxGeometry args={[0.43, 0.28, 0.42]} />
        <meshStandardMaterial
          color="#29343b"
          metalness={0.88}
          roughness={0.22}
        />
      </mesh>

      <mesh position={[0, 0.4, -0.225]}>
        <boxGeometry args={[0.25, 0.09, 0.03]} />
        <meshStandardMaterial
          color="#ffc071"
          emissive="#ff8a45"
          emissiveIntensity={1.3}
        />
      </mesh>

      <mesh castShadow position={[0, 0.67, 0.03]}>
        <cylinderGeometry args={[0.045, 0.055, 0.32, 10]} />
        <meshStandardMaterial color="#74858d" metalness={0.9} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0.84, 0.03]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial
          color="#ffc071"
          emissive="#ff8a45"
          emissiveIntensity={1.8}
        />
      </mesh>

      {[-0.34, 0.34].map((x) => (
        <group key={x} position={[x, -0.06, 0]}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.13, 12]} />
            <meshStandardMaterial
              color="#151b20"
              metalness={0.4}
              roughness={0.75}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.12, 0.025, 7, 14]} />
            <meshStandardMaterial
              color="#82929a"
              metalness={0.85}
              roughness={0.28}
            />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.04, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.24, 3]} />
        <meshStandardMaterial
          color="#ffc071"
          emissive="#ff8a45"
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#071019"]} />
      <fog attach="fog" args={["#071019", 11, 23]} />
      <ambientLight intensity={0.68} />
      <hemisphereLight args={["#a5efff", "#17222b", 1.1]} />
      <directionalLight
        castShadow
        position={[-5, 9, 5]}
        intensity={2.7}
        color="#d9f5ff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <Board />
      <Robot />
      <ContactShadows
        position={[0, -0.47, 0]}
        opacity={0.38}
        scale={12}
        blur={2.5}
        far={7}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={7}
        maxDistance={15}
        minPolarAngle={0.5}
        maxPolarAngle={1.18}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function RoboBoard() {
  return (
    <main className={styles.page} aria-label="RoboRally board with one robot">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [8, 9, 10], fov: 42, near: 0.1, far: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
    </main>
  );
}
