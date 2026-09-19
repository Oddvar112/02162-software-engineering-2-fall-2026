// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type GLTF,
  GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { type SkinnedMesh } from "three";
import { createRobotAnimator } from "./robot-animation";

let model: GLTF;
beforeAll(async () => {
  const bytes = readFileSync("public/models/robots/noodle.glb");
  model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
});
const create = () => createRobotAnimator(model.scene, model.animations);

describe("robot animation playback", () => {
  it("keeps cloned skeletons and playback independent while sharing geometry", () => {
    const first = create();
    const second = create();
    let firstMesh: SkinnedMesh | undefined;
    let secondMesh: SkinnedMesh | undefined;
    first.root.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh)
        firstMesh ??= node as SkinnedMesh;
    });
    second.root.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh)
        secondMesh ??= node as SkinnedMesh;
    });
    expect(firstMesh!.geometry).toBe(secondMesh!.geometry);
    expect(firstMesh!.skeleton.bones[0]).not.toBe(
      secondMesh!.skeleton.bones[0],
    );
    const originalPose = secondMesh!.skeleton.bones.map((bone) =>
      bone.position.toArray(),
    );
    first.setAnimation("Move");
    first.update(0.35);
    expect(first.actions.Move.time).toBeCloseTo(0.35);
    expect(second.actions.Move.time).toBe(0);
    expect(
      secondMesh!.skeleton.bones.map((bone) => bone.position.toArray()),
    ).toEqual(originalPose);
    first.dispose();
    second.dispose();
  });

  it("smoothly reverses an interrupted blend and keeps total weight at one", () => {
    const robot = create();
    robot.setAnimation("Move");
    robot.update(0.08);
    expect(robot.actions.Move.getEffectiveWeight()).toBeCloseTo(0.4);
    robot.setAnimation("Idle");
    expect(robot.actions.Move.getEffectiveWeight()).toBeCloseTo(0.4);
    robot.update(0.1);
    expect(robot.actions.Move.getEffectiveWeight()).toBeCloseTo(0.2);
    expect(robot.actions.Idle.getEffectiveWeight()).toBeCloseTo(0.8);
    robot.update(0.1);
    expect(robot.actions.Move.getEffectiveWeight()).toBe(0);
    robot.dispose();
  });

  it("survives React effect stop/start replay and resumes the same phase", () => {
    const robot = create();
    robot.setPhase(0.25);
    const time = robot.actions.Idle.time;
    robot.stop();
    robot.update(0.4);
    expect(robot.actions.Idle.time).toBe(time);
    robot.start();
    robot.update(0.1);
    expect(robot.actions.Idle.time).toBeCloseTo(time + 0.1);
    robot.stop();
    robot.start();
    robot.update(0.1);
    expect(robot.actions.Idle.time).toBeCloseTo(time + 0.2);
    robot.dispose();
  });

  it("loops at the requested speed without translating the model root", () => {
    const robot = create();
    const initialPosition = robot.root.position.toArray();
    robot.update(0.4, 0.5);
    expect(robot.actions.Idle.time).toBeCloseTo(0.2);
    robot.update(robot.actions.Idle.getClip().duration, 1);
    expect(robot.actions.Idle.time).toBeCloseTo(0.2);
    robot.update(1, 0);
    robot.update(Number.NaN);
    expect(robot.actions.Idle.time).toBeCloseTo(0.2);
    expect(robot.root.position.toArray()).toEqual(initialPosition);
    robot.dispose();
  });
});
