"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import type {
  BoardElement,
  Direction,
  GameState,
  RobotState,
} from "@/lib/game/types";
import styles from "@/app/game/game.module.css";

const CAMERA_DIRECTION = new THREE.Vector3(8, 10, 11).normalize();
const DIRECTION_ROTATION: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

function tilePosition(value: number, size: number) {
  return value - (size - 1) / 2;
}

function Conveyor({ direction }: { direction: Direction }) {
  return (
    <group
      position={[0, 0.135, 0]}
      rotation={[0, DIRECTION_ROTATION[direction], 0]}
    >
      <mesh receiveShadow>
        <boxGeometry args={[0.82, 0.05, 0.82]} />
        <meshStandardMaterial
          color="#18252b"
          metalness={0.62}
          roughness={0.38}
        />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.045, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.78]} />
          <meshStandardMaterial
            color="#32c5d6"
            emissive="#18899a"
            emissiveIntensity={0.35}
            metalness={0.72}
            roughness={0.28}
          />
        </mesh>
      ))}
      {[-0.25, 0, 0.25].map((z) => (
        <mesh key={z} position={[0, 0.065, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.64, 12]} />
          <meshStandardMaterial
            color="#81949c"
            metalness={0.85}
            roughness={0.24}
          />
        </mesh>
      ))}
      {[-0.105, 0.105].map((x) => (
        <mesh
          key={x}
          position={[x, 0.145, -0.08]}
          rotation={[0, x < 0 ? -Math.PI / 4 : Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.29, 0.025, 0.065]} />
          <meshBasicMaterial color="#d6fbff" />
        </mesh>
      ))}
    </group>
  );
}

function Checkpoint({ order }: { order: number }) {
  const checks = [
    [-0.19, -0.19, "#f5c452"],
    [0.19, -0.19, "#20292e"],
    [-0.19, 0.19, "#20292e"],
    [0.19, 0.19, "#f5c452"],
  ] as const;

  return (
    <group position={[0, 0.135, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.84, 0.05, 0.84]} />
        <meshStandardMaterial
          color="#111a1f"
          metalness={0.6}
          roughness={0.34}
        />
      </mesh>
      {checks.map(([x, z, color]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.035, z]}>
          <boxGeometry args={[0.34, 0.025, 0.34]} />
          <meshStandardMaterial
            color={color}
            metalness={0.5}
            roughness={0.42}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.075, 24]} />
        <meshStandardMaterial
          color="#17242a"
          metalness={0.78}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[0.13, 0.035, 8, 24]} />
        <meshStandardMaterial
          color="#fff0a8"
          emissive="#f4b942"
          emissiveIntensity={0.9}
        />
      </mesh>
      {Array.from({ length: order }, (_, index) => (
        <mesh
          key={index}
          position={[(index - (order - 1) / 2) * 0.075, 0.155, 0]}
        >
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshBasicMaterial color="#fff7d6" />
        </mesh>
      ))}
    </group>
  );
}

function Gear({ rotation }: { rotation: "clockwise" | "counter-clockwise" }) {
  const direction = rotation === "clockwise" ? 1 : -1;

  return (
    <group position={[0, 0.14, 0]} rotation={[0, direction * 0.12, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.39, 0.39, 0.045, 24]} />
        <meshStandardMaterial
          color="#162229"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <mesh
            key={angle}
            position={[Math.cos(angle) * 0.38, 0.045, Math.sin(angle) * 0.38]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.115, 0.055, 0.105]} />
            <meshStandardMaterial
              color="#a7b8be"
              metalness={0.86}
              roughness={0.22}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.285, 0.285, 0.075, 24]} />
        <meshStandardMaterial
          color="#d78136"
          emissive="#8f3f10"
          emissiveIntensity={0.18}
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.055, 16]} />
        <meshStandardMaterial
          color="#263840"
          metalness={0.86}
          roughness={0.22}
        />
      </mesh>
      <mesh
        position={[direction * 0.16, 0.12, -0.15]}
        rotation={[-Math.PI / 2, 0, direction * 0.7]}
      >
        <circleGeometry args={[0.075, 3]} />
        <meshBasicMaterial color="#fff1b7" />
      </mesh>
    </group>
  );
}

function Wall({ side }: { side: Direction }) {
  const vertical = side === "east" || side === "west";
  const edge = side === "north" || side === "west" ? -0.47 : 0.47;

  return (
    <mesh castShadow position={vertical ? [edge, 0.38, 0] : [0, 0.38, edge]}>
      <boxGeometry args={vertical ? [0.08, 0.56, 0.94] : [0.94, 0.56, 0.08]} />
      <meshStandardMaterial color="#d7dde0" metalness={0.72} roughness={0.3} />
    </mesh>
  );
}

function BoardElementMesh({ element }: { element: BoardElement }) {
  switch (element.type) {
    case "checkpoint":
      return <Checkpoint order={element.order} />;
    case "conveyor":
      return <Conveyor direction={element.direction} />;
    case "gear":
      return <Gear rotation={element.rotation} />;
    case "wall":
      return <Wall side={element.side} />;
    case "pit":
      return (
        <mesh position={[0, 0.105, 0]}>
          <boxGeometry args={[0.76, 0.025, 0.76]} />
          <meshStandardMaterial
            color="#071018"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>
      );
  }
}

function Board({ gameState }: { gameState: GameState }) {
  const { width, height, elements } = gameState.board;
  const elementByTile = new Map<string, BoardElement[]>();

  elements.forEach((element) => {
    const key = `${element.x}-${element.z}`;
    elementByTile.set(key, [...(elementByTile.get(key) ?? []), element]);
  });

  return (
    <group>
      <mesh position={[0, -0.28, 0]} receiveShadow>
        <boxGeometry args={[width + 0.7, 0.42, height + 0.7]} />
        <meshStandardMaterial
          color="#2b3f4b"
          metalness={0.48}
          roughness={0.52}
        />
      </mesh>

      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width;
        const z = Math.floor(index / width);
        const tileElements = elementByTile.get(`${x}-${z}`) ?? [];
        const isPit = tileElements.some((element) => element.type === "pit");

        return (
          <group
            key={`${x}-${z}`}
            position={[tilePosition(x, width), 0, tilePosition(z, height)]}
          >
            <mesh receiveShadow>
              <boxGeometry args={[0.94, 0.2, 0.94]} />
              <meshStandardMaterial
                color={
                  isPit ? "#1a2831" : (x + z) % 2 === 0 ? "#667b88" : "#536a77"
                }
                metalness={isPit ? 0.18 : 0.42}
                roughness={isPit ? 0.82 : 0.56}
              />
            </mesh>
            {tileElements.map((element) => (
              <BoardElementMesh key={element.id} element={element} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Robot({
  robot,
  board,
  isCurrent,
}: {
  robot: RobotState;
  board: GameState["board"];
  isCurrent: boolean;
}) {
  return (
    <group
      position={[
        tilePosition(robot.x, board.width),
        0.33,
        tilePosition(robot.z, board.height),
      ]}
      rotation={[0, DIRECTION_ROTATION[robot.direction], 0]}
    >
      {isCurrent && (
        <mesh position={[0, -0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.45, 28]} />
          <meshBasicMaterial color="#73edf4" transparent opacity={0.88} />
        </mesh>
      )}

      <mesh castShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.58, 0.5, 0.6]} />
        <meshStandardMaterial
          color={robot.color}
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
          color="#b9f7ff"
          emissive="#2cc5dc"
          emissiveIntensity={1.1}
        />
      </mesh>
      <mesh castShadow position={[0, 0.67, 0.03]}>
        <cylinderGeometry args={[0.045, 0.055, 0.32, 10]} />
        <meshStandardMaterial
          color="#82939c"
          metalness={0.82}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.84, 0.03]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial
          color="#fff0a8"
          emissive="#f4b942"
          emissiveIntensity={1.5}
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
              color="#9aabb3"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.04, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.24, 3]} />
        <meshStandardMaterial
          color="#fff0a8"
          emissive="#f4b942"
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}

function ResponsiveCameraControls({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { camera, size, invalidate } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
  const sceneRadius = Math.hypot((width + 0.7) / 2, (height + 0.7) / 2, 1.25);
  const verticalHalfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const fitDistance = (sceneRadius / Math.sin(limitingHalfFov)) * 1.08;

  useLayoutEffect(() => {
    perspectiveCamera.position
      .copy(CAMERA_DIRECTION)
      .multiplyScalar(fitDistance);
    perspectiveCamera.near = 0.1;
    perspectiveCamera.far = Math.max(100, fitDistance * 4);
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
      minDistance={fitDistance * 0.6}
      maxDistance={fitDistance * 1.5}
      minPolarAngle={0.48}
      maxPolarAngle={1.2}
      target={[0, 0, 0]}
    />
  );
}

function Scene({ gameState }: { gameState: GameState }) {
  return (
    <>
      <color attach="background" args={["#152630"]} />
      <fog attach="fog" args={["#152630", 32, 78]} />
      <ambientLight intensity={1.12} />
      <hemisphereLight args={["#d6f7ff", "#344550", 1.55]} />
      <directionalLight
        castShadow
        position={[-6, 10, 6]}
        intensity={3.1}
        color="#f1fbff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={28}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <Board gameState={gameState} />
      {gameState.robots.map((robot) => (
        <Robot
          key={robot.id}
          robot={robot}
          board={gameState.board}
          isCurrent={robot.playerId === gameState.currentPlayerId}
        />
      ))}
      <ContactShadows
        frames={1}
        position={[0, -0.47, 0]}
        opacity={0.32}
        scale={Math.max(gameState.board.width, gameState.board.height) + 4}
        blur={2.5}
        far={8}
      />
      <ResponsiveCameraControls
        width={gameState.board.width}
        height={gameState.board.height}
      />
    </>
  );
}

export function RoboBoard({ gameState }: { gameState: GameState }) {
  const summary = `${gameState.board.width} by ${gameState.board.height} RoboRally board with ${gameState.robots.length} robots`;

  return (
    <div className={styles.canvas} role="img" aria-label={summary}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.65]}
        camera={{ position: [8, 10, 11], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene gameState={gameState} />
      </Canvas>
    </div>
  );
}
