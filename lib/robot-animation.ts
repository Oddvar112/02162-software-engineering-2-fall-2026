import {
  AnimationClip,
  AnimationMixer,
  LoopRepeat,
  type Object3D,
  type Skeleton,
  type SkinnedMesh,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type RobotAnimation = "Idle" | "Move";

/** Works with plain Three.js too. Each instance owns its skeleton and mixer. */
export function createRobotAnimator(source: Object3D, clips: AnimationClip[]) {
  const root = clone(source);
  const mixer = new AnimationMixer(root);
  const actions = Object.fromEntries(
    (["Idle", "Move"] as const).map((name) => {
      const clip = AnimationClip.findByName(clips, name);
      if (!clip) throw new Error(`Robot model is missing its ${name} clip`);
      const action = mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity).play();
      action.setEffectiveWeight(name === "Idle" ? 1 : 0);
      return [name, action];
    }),
  );
  const skeletons = new Set<Skeleton>();
  root.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
    if ((object as SkinnedMesh).isSkinnedMesh) {
      skeletons.add((object as SkinnedMesh).skeleton);
    }
  });
  mixer.update(0);

  let current: RobotAnimation = "Idle";
  let blend = 1;
  let from = { Idle: 1, Move: 0 };

  return {
    root,
    mixer,
    actions,
    start() {
      for (const action of Object.values(actions)) action.paused = false;
      mixer.update(0);
    },
    stop() {
      for (const action of Object.values(actions)) action.paused = true;
      // Release per-instance GPU textures on React detach. Three recreates them
      // when the same skeleton renders again after an effect replay.
      for (const skeleton of skeletons) skeleton.dispose();
    },
    setAnimation(next: RobotAnimation) {
      if (next === current) return;
      // Retarget current weights: rapid toggles never jump back to weight zero.
      from = {
        Idle: actions.Idle.getEffectiveWeight(),
        Move: actions.Move.getEffectiveWeight(),
      };
      current = next;
      blend = 0;
    },
    setPhase(phase: number) {
      for (const action of Object.values(actions)) {
        action.time = (((phase % 1) + 1) % 1) * action.getClip().duration;
      }
      mixer.update(0);
    },
    update(delta: number, playbackRate = 1) {
      if (
        !Number.isFinite(delta) ||
        delta <= 0 ||
        !Number.isFinite(playbackRate) ||
        playbackRate <= 0
      )
        return;
      blend = Math.min(1, blend + delta / 0.2);
      for (const name of ["Idle", "Move"] as const) {
        const target = name === current ? 1 : 0;
        actions[name].setEffectiveWeight(
          from[name] + (target - from[name]) * blend,
        );
      }
      mixer.update(delta * Math.max(0, playbackRate));
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      for (const skeleton of skeletons) skeleton.dispose();
      // Cached GLTF geometry/materials are shared and belong to the loader.
    },
  };
}
