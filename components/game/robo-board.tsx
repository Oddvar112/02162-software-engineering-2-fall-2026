"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import styles from "@/app/game/game.module.css";

const BOARD_SIZE = 8;
const HALF_BOARD = (BOARD_SIZE - 1) / 2;
const BOARD_EDGE = BOARD_SIZE + 0.7;
const SCENE_RADIUS = Math.hypot(BOARD_EDGE / 2, BOARD_EDGE / 2, 1.25);
const CAMERA_DIRECTION = new THREE.Vector3(8, 9, 10).normalize();
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
        <boxGeometry args={[BOARD_EDGE, 0.42, BOARD_EDGE]} />
        <meshStandardMaterial
          color="#2b3f4b"
          metalness={0.48}
          roughness={0.52}
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
            color={(x + z) % 2 === 0 ? "#667b88" : "#536a77"}
            metalness={0.42}
            roughness={0.56}
          />
        </mesh>
      ))}
    </group>
  );
}

function Robot() {
  return (
    <group position={[-0.5, 0.33, 1.5]}>
      <mesh castShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.58, 0.5, 0.6]} />
        <meshStandardMaterial
          color="#ed5a54"
          metalness={0.58}
          roughness={0.34}
        />
      </mesh>

      <mesh castShadow position={[0, 0.38, -0.02]}>
        <boxGeometry args={[0.43, 0.28, 0.42]} />
        <meshStandardMaterial
          color="#43545e"
          metalness={0.72}
          roughness={0.3}
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

function ResponsiveCameraControls() {
  const { camera, size, invalidate } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
  const verticalHalfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const fitDistance = (SCENE_RADIUS / Math.sin(limitingHalfFov)) * 1.08;

  useLayoutEffect(() => {
    perspectiveCamera.position
      .copy(CAMERA_DIRECTION)
      .multiplyScalar(fitDistance);
    perspectiveCamera.near = 0.1;
    perspectiveCamera.far = Math.max(80, fitDistance * 4);
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.lookAt(0, 0, 0);
    perspectiveCamera.updateProjectionMatrix();
    const frame = requestAnimationFrame(invalidate);

    return () => cancelAnimationFrame(frame);
  }, [aspect, fitDistance, invalidate, perspectiveCamera]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={fitDistance * 0.55}
      maxDistance={fitDistance * 1.5}
      minPolarAngle={0.5}
      maxPolarAngle={1.18}
      target={[0, 0, 0]}
    />
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#172833"]} />
      <fog attach="fog" args={["#172833", 30, 70]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#d6f7ff", "#344550", 1.6]} />
      <directionalLight
        castShadow
        position={[-5, 9, 5]}
        intensity={3.2}
        color="#f1fbff"
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
        frames={1}
        position={[0, -0.47, 0]}
        opacity={0.38}
        scale={12}
        blur={2.5}
        far={7}
      />
      <ResponsiveCameraControls />
    </>
  );
}

export function RoboBoard() {
  return (
    <main className={styles.page} aria-label="RoboRally board with one robot">
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [8, 9, 10], fov: 42, near: 0.1, far: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
    </main>
  );
}
