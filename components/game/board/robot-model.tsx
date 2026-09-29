"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import roster from "@/lib/robots.json";
import {
  createRobotAnimator,
  type RobotAnimation,
} from "@/lib/robot-animation";
import { useMotionPreferences } from "@/lib/hooks/use-motion-preferences";

export const ROBOT_ROSTER = roster;

/** Grounded at local Y=0, facing -Z; sized for one board tile. */
export function RobotModel({
  id,
  animation = "Idle",
  paused = false,
  playbackRate = 1,
  phase = 0,
}: {
  id: string;
  animation?: RobotAnimation;
  paused?: boolean;
  playbackRate?: number;
  phase?: number;
}) {
  const { scene, animations } = useGLTF(`/models/robots/${id}.glb`);
  const animator = useMemo(
    () => createRobotAnimator(scene, animations),
    [scene, animations],
  );
  const invalidate = useThree((state) => state.invalidate);
  const { reducedMotion, visible } = useMotionPreferences();
  const playing = !paused && !reducedMotion && visible && playbackRate > 0;

  useEffect(() => {
    animator.setAnimation(animation);
    invalidate();
  }, [animation, animator, invalidate]);

  useEffect(() => {
    animator.setPhase(phase);
    invalidate();
  }, [animator, phase, invalidate]);

  useEffect(() => {
    animator.start();
    invalidate();
    // React can replay this effect. Keep bindings reusable; this instance and
    // mixer are garbage-collected together when the component truly unmounts.
    return () => animator.stop();
  }, [animator, invalidate]);

  useEffect(() => {
    invalidate();
  }, [playing, invalidate]);

  useFrame((_, delta) => {
    if (!playing) return;
    animator.update(Math.min(delta, 0.1), playbackRate);
    // Also works inside a demand-driven canvas; stops requesting frames on pause.
    invalidate();
  });

  return <primitive object={animator.root} dispose={null} />;
}
