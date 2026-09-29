"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { RobotModel } from "./robot-model";
import { TileMesh } from "./tile-mesh";
import { DIRECTION_ROTATION, tilePosition } from "./board-coordinates";
import { getRobotAppearance } from "@/lib/game/robot-appearance";
import { useMotionPreferences } from "@/lib/hooks/use-motion-preferences";
import * as THREE from "three";
import type { GameState, RobotState } from "@/lib/game/types";
import type { PosPair } from "@/lib/board";
import styles from "@/components/game/game-state.module.css";

const CAMERA_DIRECTION = new THREE.Vector3(8, 10, 11).normalize();
function Wall({
  wall,
  width,
  height,
}: {
  wall: PosPair;
  width: number;
  height: number;
}) {
  const vertical = wall.One.x !== wall.Two.x;

  return (
    <mesh
      castShadow
      position={[
        tilePosition((wall.One.x + wall.Two.x) / 2, width),
        0.38,
        tilePosition((wall.One.y + wall.Two.y) / 2, height),
      ]}
    >
      <boxGeometry args={vertical ? [0.08, 0.56, 0.94] : [0.94, 0.56, 0.08]} />
      <meshStandardMaterial color="#d7dde0" metalness={0.72} roughness={0.3} />
    </mesh>
  );
}

function Board({ gameState }: { gameState: GameState }) {
  const { width, height, tiles, walls } = gameState.board;

  return (
    <group>
      <mesh position={[0, -0.28, 0]} receiveShadow>
        <boxGeometry args={[width + 0.7, 0.42, height + 0.7]} />
        <meshStandardMaterial
          color="#272d2e"
          metalness={0.48}
          roughness={0.52}
        />
      </mesh>

      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width;
        const z = Math.floor(index / width);
        const tile = tiles[z][x];
        const isPit = tile.kind === "pit";

        return (
          <group
            key={`${x}-${z}`}
            position={[tilePosition(x, width), 0, tilePosition(z, height)]}
          >
            <mesh receiveShadow>
              <boxGeometry args={[0.94, 0.2, 0.94]} />
              <meshStandardMaterial
                color={
                  isPit ? "#141819" : (x + z) % 2 === 0 ? "#606766" : "#4d5554"
                }
                metalness={isPit ? 0.18 : 0.42}
                roughness={isPit ? 0.82 : 0.56}
              />
            </mesh>
            <TileMesh tile={tile} />
          </group>
        );
      })}
      {walls.map((wall, index) => (
        <Wall key={index} wall={wall} width={width} height={height} />
      ))}
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
  const group = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const { reducedMotion } = useMotionPreferences();
  const invalidate = useThree((state) => state.invalidate);
  const targetX = tilePosition(robot.x, board.width);
  const targetZ = tilePosition(robot.z, board.height);
  const targetAngle = DIRECTION_ROTATION[robot.direction];
  const [initialPose] = useState(() => ({
    position: [targetX, 0.1, targetZ] as [number, number, number],
    rotation: [0, targetAngle, 0] as [number, number, number],
  }));

  useLayoutEffect(() => {
    invalidate();
  }, [targetX, targetZ, targetAngle, invalidate]);

  useFrame((_, delta) => {
    const model = group.current;
    if (!model) return;
    const angleDifference = Math.atan2(
      Math.sin(targetAngle - model.rotation.y),
      Math.cos(targetAngle - model.rotation.y),
    );
    const distance = Math.hypot(
      targetX - model.position.x,
      targetZ - model.position.z,
    );
    const inMotion =
      !reducedMotion &&
      (distance >= 0.001 || Math.abs(angleDifference) >= 0.001);
    if (moving !== inMotion) setMoving(inMotion);
    if (!inMotion) {
      model.position.set(targetX, 0.1, targetZ);
      model.rotation.y = targetAngle;
      return;
    }
    // Limit the first idle frame's delta so a demand-rendered scene cannot
    // skip an entire movement when the next program starts.
    const factor = 1 - Math.exp(-12 * Math.min(delta, 1 / 30));
    model.position.x += (targetX - model.position.x) * factor;
    model.position.z += (targetZ - model.position.z) * factor;
    model.rotation.y += angleDifference * factor;
    invalidate();
  });

  return (
    <group
      ref={group}
      position={initialPose.position}
      rotation={initialPose.rotation}
    >
      {isCurrent && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.45, 28]} />
          <meshBasicMaterial color="#b5f23b" transparent opacity={0.88} />
        </mesh>
      )}

      <Suspense fallback={null}>
        <RobotModel
          id={getRobotAppearance(robot).modelId}
          animation={moving ? "Move" : "Idle"}
        />
      </Suspense>
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
        frames={gameState.phase === "execution" ? Infinity : 1}
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

export function GameBoard({ gameState }: { gameState: GameState }) {
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
