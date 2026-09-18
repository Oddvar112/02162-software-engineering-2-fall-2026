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
          color="#111516"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.045, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.78]} />
          <meshStandardMaterial
            color="#d39116"
            emissive="#7a4700"
            emissiveIntensity={0.18}
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
          <meshBasicMaterial color="#b5f23b" />
        </mesh>
      ))}
    </group>
  );
}

function Checkpoint({ order }: { order: number }) {
  const corners = [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ] as const;

  return (
    <group position={[0, 0.135, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.84, 0.05, 0.84]} />
        <meshStandardMaterial
          color="#111516"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      {corners.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.035, z]}>
          <boxGeometry args={[0.16, 0.035, 0.16]} />
          <meshStandardMaterial
            color="#d39116"
            emissive="#754500"
            emissiveIntensity={0.18}
            metalness={0.66}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.075, 8]} />
        <meshStandardMaterial
          color="#252d2d"
          metalness={0.84}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[0.155, 0.025, 8, 24]} />
        <meshStandardMaterial
          color="#cfff65"
          emissive="#84c900"
          emissiveIntensity={1.1}
        />
      </mesh>
      {Array.from({ length: order }, (_, index) => (
        <mesh
          key={index}
          position={[(index - (order - 1) / 2) * 0.075, 0.155, 0]}
        >
          <boxGeometry args={[0.035, 0.035, 0.035]} />
          <meshBasicMaterial color="#ffb000" />
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
          color="#101415"
          metalness={0.82}
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
              color="#657071"
              metalness={0.86}
              roughness={0.22}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.285, 0.285, 0.075, 24]} />
        <meshStandardMaterial
          color="#252c2c"
          emissive="#756000"
          emissiveIntensity={0.08}
          metalness={0.82}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.055, 16]} />
        <meshStandardMaterial
          color="#0d1011"
          metalness={0.86}
          roughness={0.22}
        />
      </mesh>
      <mesh
        position={[direction * 0.16, 0.12, -0.15]}
        rotation={[-Math.PI / 2, 0, direction * 0.7]}
      >
        <circleGeometry args={[0.075, 3]} />
        <meshBasicMaterial color="#b5f23b" />
      </mesh>
    </group>
  );
}

function Wall({ side }: { side: Direction }) {
  const vertical = side === "east" || side === "west";
  const edge = side === "north" || side === "west" ? -0.47 : 0.47;

  return (
    <group position={vertical ? [edge, 0.39, 0] : [0, 0.39, edge]}>
      <mesh castShadow>
        <boxGeometry
          args={vertical ? [0.11, 0.58, 0.94] : [0.94, 0.58, 0.11]}
        />
        <meshStandardMaterial
          color="#252c2d"
          metalness={0.82}
          roughness={0.26}
        />
      </mesh>
      {[-0.32, -0.1, 0.12, 0.34].map((offset, index) => (
        <mesh
          key={offset}
          position={vertical ? [0, 0.31, offset] : [offset, 0.31, 0]}
        >
          <boxGeometry
            args={vertical ? [0.13, 0.035, 0.14] : [0.14, 0.035, 0.13]}
          />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#ffb000" : "#111516"}
            emissive={index % 2 === 0 ? "#6f4300" : "#000000"}
            emissiveIntensity={0.16}
            metalness={0.66}
            roughness={0.32}
          />
        </mesh>
      ))}
    </group>
  );
}

function Pit() {
  return (
    <group position={[0, 0.115, 0]}>
      <mesh position={[0, -0.025, 0]}>
        <boxGeometry args={[0.74, 0.035, 0.74]} />
        <meshStandardMaterial
          color="#030505"
          metalness={0.12}
          roughness={0.92}
        />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={`x-${x}`} position={[x, 0.015, 0]}>
          <boxGeometry args={[0.035, 0.035, 0.76]} />
          <meshStandardMaterial
            color="#9e6b0b"
            metalness={0.64}
            roughness={0.36}
          />
        </mesh>
      ))}
      {[-0.36, 0.36].map((z) => (
        <mesh key={`z-${z}`} position={[0, 0.015, z]}>
          <boxGeometry args={[0.76, 0.035, 0.035]} />
          <meshStandardMaterial
            color="#9e6b0b"
            metalness={0.64}
            roughness={0.36}
          />
        </mesh>
      ))}
    </group>
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
      return <Pit />;
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
          color="#15191a"
          metalness={0.68}
          roughness={0.38}
        />
      </mesh>

      {[-1, 1].map((edge) => (
        <mesh
          key={`rail-x-${edge}`}
          position={[edge * (width / 2 + 0.14), 0, 0]}
        >
          <boxGeometry args={[0.18, 0.32, height + 0.38]} />
          <meshStandardMaterial
            color="#242a2b"
            metalness={0.82}
            roughness={0.26}
          />
        </mesh>
      ))}
      {[-1, 1].map((edge) => (
        <mesh
          key={`rail-z-${edge}`}
          position={[0, 0, edge * (height / 2 + 0.14)]}
        >
          <boxGeometry args={[width + 0.38, 0.32, 0.18]} />
          <meshStandardMaterial
            color="#242a2b"
            metalness={0.82}
            roughness={0.26}
          />
        </mesh>
      ))}
      {[-1, 1].flatMap((xEdge) =>
        [-1, 1].map((zEdge) => (
          <mesh
            key={`node-${xEdge}-${zEdge}`}
            position={[
              xEdge * (width / 2 + 0.14),
              0.2,
              zEdge * (height / 2 + 0.14),
            ]}
          >
            <boxGeometry args={[0.16, 0.08, 0.16]} />
            <meshStandardMaterial
              color="#b5f23b"
              emissive="#629400"
              emissiveIntensity={0.7}
              metalness={0.46}
              roughness={0.3}
            />
          </mesh>
        )),
      )}

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
                  isPit ? "#111415" : (x + z) % 2 === 0 ? "#343a39" : "#2b3030"
                }
                metalness={isPit ? 0.28 : 0.66}
                roughness={isPit ? 0.76 : 0.42}
              />
            </mesh>
            {!isPit && (
              <mesh position={[0, 0.11, 0]} receiveShadow>
                <boxGeometry args={[0.79, 0.025, 0.79]} />
                <meshStandardMaterial
                  color={(x + z) % 2 === 0 ? "#454c4a" : "#3c4241"}
                  metalness={0.72}
                  roughness={0.36}
                />
              </mesh>
            )}
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
          <meshBasicMaterial color="#b5f23b" transparent opacity={0.88} />
        </mesh>
      )}

      <mesh castShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[0.66, 0.22, 0.66]} />
        <meshStandardMaterial
          color="#171b1c"
          metalness={0.82}
          roughness={0.28}
        />
      </mesh>
      <mesh castShadow position={[0, 0.14, 0]}>
        <boxGeometry args={[0.5, 0.32, 0.52]} />
        <meshStandardMaterial
          color="#2b3232"
          metalness={0.76}
          roughness={0.32}
        />
      </mesh>
      <mesh castShadow position={[0, 0.15, -0.27]}>
        <boxGeometry args={[0.34, 0.22, 0.025]} />
        <meshStandardMaterial
          color={robot.color}
          emissive={robot.color}
          emissiveIntensity={0.12}
          metalness={0.62}
          roughness={0.34}
        />
      </mesh>
      {[-0.265, 0.265].map((x) => (
        <mesh key={`armor-${x}`} castShadow position={[x, 0.13, 0]}>
          <boxGeometry args={[0.035, 0.18, 0.36]} />
          <meshStandardMaterial
            color={robot.color}
            metalness={0.68}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.38, 0.02]}>
        <boxGeometry args={[0.34, 0.16, 0.34]} />
        <meshStandardMaterial
          color="#171b1c"
          metalness={0.84}
          roughness={0.24}
        />
      </mesh>
      <mesh position={[0, 0.39, -0.16]}>
        <boxGeometry args={[0.2, 0.065, 0.018]} />
        <meshStandardMaterial
          color="#cfff65"
          emissive="#79b900"
          emissiveIntensity={1.3}
        />
      </mesh>
      <mesh castShadow position={[0, 0.59, 0.04]}>
        <cylinderGeometry args={[0.035, 0.045, 0.28, 8]} />
        <meshStandardMaterial
          color="#667172"
          metalness={0.88}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 0.75, 0.04]}>
        <boxGeometry args={[0.1, 0.08, 0.1]} />
        <meshStandardMaterial
          color="#ffb000"
          emissive="#a96200"
          emissiveIntensity={1.2}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {[-0.34, 0.34].map((x) => (
        <group key={x} position={[x, -0.08, 0]}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.145, 0.145, 0.12, 12]} />
            <meshStandardMaterial
              color="#080a0a"
              metalness={0.38}
              roughness={0.82}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.1, 0.02, 7, 14]} />
            <meshStandardMaterial
              color="#737e7e"
              metalness={0.86}
              roughness={0.24}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.01, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.085, 0.2, 3]} />
        <meshStandardMaterial
          color="#b5f23b"
          emissive="#659800"
          emissiveIntensity={0.8}
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
      <color attach="background" args={["#0d1112"]} />
      <fog attach="fog" args={["#0d1112", 32, 78]} />
      <ambientLight intensity={0.92} />
      <hemisphereLight args={["#dfe8df", "#242b28", 1.35]} />
      <directionalLight
        castShadow
        position={[-6, 10, 6]}
        intensity={2.8}
        color="#f3f1dd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={28}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight
        position={[5, 4, -5]}
        intensity={2.2}
        distance={16}
        color="#b5f23b"
      />
      <pointLight
        position={[-5, 3, 5]}
        intensity={1.5}
        distance={13}
        color="#ffb000"
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
