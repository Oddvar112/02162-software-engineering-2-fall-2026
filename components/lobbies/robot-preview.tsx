"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import {
  RobotModel,
  robotModelPath,
} from "@/components/game/board/robot-model";
import roster from "@/lib/robots.json";

const SWITCH_MS = 2500;

function CyclingRobot({ id }: { id: string }) {
  const [moving, setMoving] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMoving((value) => !value),
      SWITCH_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  return <RobotModel id={id} animation={moving ? "Move" : "Idle"} />;
}

export function usePreloadRobots() {
  useEffect(() => {
    for (const robot of roster) useGLTF.preload(robotModelPath(robot.id));
  }, []);
}

export function RobotPreview({
  id,
  className = "h-52 w-52",
}: {
  id: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [1.25, 0.85, 1.8], fov: 42 }}
      >
        <ambientLight intensity={1.15} />
        <hemisphereLight args={["#d6f7ff", "#344550", 1.6]} />
        <directionalLight position={[-5, 9, 5]} intensity={3.2} />
        <group position={[0, -0.4, 0]} rotation={[0, Math.PI, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.75, 40]} />
            <meshStandardMaterial color="#d7dde0" />
          </mesh>
          {id && (
            <Suspense fallback={null}>
              <CyclingRobot key={id} id={id} />
            </Suspense>
          )}
        </group>
      </Canvas>
    </div>
  );
}
