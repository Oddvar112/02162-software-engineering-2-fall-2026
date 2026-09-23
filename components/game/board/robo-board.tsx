"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import styles from "@/app/game/game.module.css";
import { ROBOT_ROSTER, RobotModel } from "@/components/game/board/robot-model";
import { type RobotAnimation } from "@/lib/robot-animation";
import { useMotionPreferences } from "@/lib/hooks/use-motion-preferences";

type PreviewSettings = {
  selected: string;
  animation: RobotAnimation;
  paused: boolean;
  playbackRate: number;
};

const BOARD_SIZE = 8;
const HALF_BOARD = (BOARD_SIZE - 1) / 2;
const FOCUSED_TILE_INDEX = Math.floor(BOARD_SIZE / 2);
const FOCUSED_ROBOT_POSITION: [number, number, number] = [
  FOCUSED_TILE_INDEX - HALF_BOARD,
  0.1,
  FOCUSED_TILE_INDEX - HALF_BOARD,
];
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

function Robots({
  selected,
  animation,
  paused,
  playbackRate,
}: PreviewSettings) {
  const robots =
    selected === "all"
      ? ROBOT_ROSTER
      : ROBOT_ROSTER.filter((robot) => robot.id === selected);
  return (
    <group>
      {robots.map((robot, index) => (
        <group
          key={robot.id}
          name={robot.name}
          position={
            selected === "all"
              ? [(index % 5) - 2.5, 0.1, Math.floor(index / 5) * 3 - 1.5]
              : FOCUSED_ROBOT_POSITION
          }
          rotation={[0, Math.PI, 0]}
        >
          <Suspense fallback={null}>
            <RobotModel
              id={robot.id}
              animation={animation}
              paused={paused}
              playbackRate={playbackRate}
              phase={selected === "all" ? index * 0.137 : 0}
            />
          </Suspense>
        </group>
      ))}
    </group>
  );
}

function ResponsiveCameraControls({ focused }: { focused: boolean }) {
  const { camera, size, invalidate } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
  const verticalHalfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const fitDistance =
    ((focused ? 1.15 : SCENE_RADIUS) / Math.sin(limitingHalfFov)) * 1.08;
  const targetX = focused ? FOCUSED_ROBOT_POSITION[0] : 0;
  const targetY = focused ? 0.65 : 0;
  const targetZ = focused ? FOCUSED_ROBOT_POSITION[2] : 0;

  useLayoutEffect(() => {
    perspectiveCamera.position
      .copy(
        focused ? new THREE.Vector3(2.8, 1.8, 4).normalize() : CAMERA_DIRECTION,
      )
      .multiplyScalar(fitDistance)
      .add(new THREE.Vector3(targetX, targetY, targetZ));
    perspectiveCamera.near = 0.1;
    perspectiveCamera.far = Math.max(80, fitDistance * 4);
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.lookAt(targetX, targetY, targetZ);
    perspectiveCamera.updateProjectionMatrix();
    const frame = requestAnimationFrame(invalidate);

    return () => cancelAnimationFrame(frame);
  }, [
    aspect,
    fitDistance,
    focused,
    invalidate,
    perspectiveCamera,
    targetX,
    targetY,
    targetZ,
  ]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={fitDistance * 0.55}
      maxDistance={fitDistance * 1.5}
      minPolarAngle={0.5}
      maxPolarAngle={1.18}
      target={[targetX, targetY, targetZ]}
    />
  );
}

function Scene(settings: PreviewSettings) {
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
        shadow-normalBias={0.025}
        shadow-bias={-0.0001}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <Board />
      <Robots {...settings} />
      <ContactShadows
        frames={1}
        position={[0, -0.47, 0]}
        opacity={0.38}
        scale={12}
        blur={2.5}
        far={7}
      />
      <ResponsiveCameraControls focused={settings.selected !== "all"} />
    </>
  );
}

export function RoboBoard() {
  const [selected, setSelected] = useState("all");
  const [animation, setAnimation] = useState<RobotAnimation>("Idle");
  const [paused, setPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const { reducedMotion } = useMotionPreferences();

  return (
    <main
      className={styles.page}
      aria-label="RoboRally board with ten distinct robot characters"
    >
      <section className={styles.controls} aria-label="Robot animation preview">
        <div className={styles.heading}>
          <strong>The Factory Misfits</strong>
          <span>
            {reducedMotion
              ? "Reduced motion · playback paused"
              : "Idle and movement preview"}
          </span>
        </div>
        <label className={styles.field}>
          <span>Robot</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="all">All ten robots</option>
            {ROBOT_ROSTER.map((robot) => (
              <option key={robot.id} value={robot.id}>
                {robot.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.buttons} role="group" aria-label="Animation">
          {(["Idle", "Move"] as const).map((clip) => (
            <button
              key={clip}
              type="button"
              aria-pressed={animation === clip}
              onClick={() => setAnimation(clip)}
            >
              {clip}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.pause}
          disabled={reducedMotion}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <label className={styles.field}>
          <span>Speed</span>
          <select
            value={playbackRate}
            onChange={(event) => setPlaybackRate(Number(event.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
          </select>
        </label>
        <p className={styles.hint}>
          Select a robot for a closer look. Movement plays in place.
        </p>
      </section>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [8, 9, 10], fov: 42, near: 0.1, far: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene
          selected={selected}
          animation={animation}
          paused={paused}
          playbackRate={playbackRate}
        />
      </Canvas>
    </main>
  );
}
