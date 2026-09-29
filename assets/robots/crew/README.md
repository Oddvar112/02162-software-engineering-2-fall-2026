# The Factory Misfits

Ten original RoboRally robots with distinct colors, silhouettes, faces and
personalities. Each has a mechanical skeleton and two baked, seamless GLB clips:
`Idle` and `Move`. The existing Three.js / React Three Fiber stack plays them
without Blender, additional packages, textures or decoders.

| Robot                 | Idle personality                                  | Movement                                            |
| --------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Bolt · coral          | Impatient engine tremor and antenna sway          | Fast wheels and racing lean                         |
| Gizmo · yellow        | Nervous pupil glances, blinks and fidgeting hands | Three alternating tripod feet                       |
| Brutus · blue         | Slow head scan and heavy fist shrug               | Cycling belt links, sprockets and suspension rumble |
| Noodle · mint         | Breathing spring, dreamy head tilt and loose arms | Articulated boots and bouncing spring spine         |
| Disco · purple        | Rhythmic sway and jazz hands                      | Rolling ball and dancing torso                      |
| Chomp · lime          | Watchful eye stalks and snapping pincers          | Four legs moving in diagonal pairs                  |
| Pixel · pink          | Curious CRT tilt, pixel blink and aerial wobble   | Scooter wheels and lively head bounce               |
| Snooze · orange       | Sleepy nod and heavy eyelids                      | Slow rollers and rotating wind-up key               |
| Captain · ivory/brass | Small salute and confident head scan              | Steady castors and restrained sway                  |
| Glitch · cyan         | Irregular twitches and mismatched arm fidgets     | Lopsided wheel-and-foot gait                        |

## Preview and deliverables

Run the app and open `/game`. Select a robot to zoom in, switch `Idle` / `Move`,
pause or change playback speed. Idle phases are offset across the whole cast.
The preview pauses for reduced-motion preferences and while the tab is hidden.

- `factory-misfits.blend`: all ten editable characters in named collections with
  mechanical armatures, skin weights and named actions, saved with Blender's
  compression enabled. Idle NLA tracks are enabled
  for the saved lineup; select a rig to inspect its actions in Blender.
- `factory-misfits-glb.zip` (optional local export, ignored by Git): ten animated
  GLBs, manifest, this guide and the reusable Three.js controller
  (`robot-animation.ts`). Generate it with the command below when sharing a pack.
- `../../../public/models/robots/`: standalone animated GLBs and `manifest.json`
  with clip durations/descriptions, dimensions, colors and mesh statistics.
- `../../../public/robots/previews/`: transparent studio renders.
- `../../../public/robots/lineup.html`: character gallery and individual downloads.
- `validation.json`: checks of exported geometry and animation envelopes.

`lib/robots.json` is the canonical roster. The earlier RIVET prototype and local
gallery screenshots are ignored by Git. The repository includes the runtime GLBs,
gallery assets, compressed editable Blender source and generation scripts, so a
fresh checkout can run the web preview without installing Blender.

## React Three Fiber integration

Inside an existing R3F `Canvas`, wrap loading in `Suspense` and place the robot in
an outer group that your gameplay code moves and rotates:

```tsx
import { Suspense } from "react";
import { RobotModel } from "@/components/game/board/robot-model";

<group position={[tileX, 0.1, tileZ]} rotation={[0, heading, 0]}>
  <Suspense fallback={null}>
    <RobotModel
      id="noodle"
      animation={isMoving ? "Move" : "Idle"}
      paused={isPaused}
      playbackRate={1}
    />
  </Suspense>
</group>;
```

The component owns an independent cloned skeleton and mixer per instance. It
blends states over 200 ms, handles interrupted blends and shares loaded geometry
and materials. It also works in a `frameloop="demand"` canvas, requesting frames
only during playback (or when controls invalidate the scene).

## Plain Three.js integration

Use `lib/robot-animation.ts` (also included in the archive), or play the clips
with your own `AnimationMixer`. The controller uses `SkeletonUtils.clone` so
multiple copies of the same character can animate independently:

```ts
import { Clock } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createRobotAnimator } from "./robot-animation";

const gltf = await new GLTFLoader().loadAsync("/models/robots/noodle.glb");
const robot = createRobotAnimator(gltf.scene, gltf.animations);
scene.add(robot.root);
robot.setAnimation("Idle");
const clock = new Clock();

// In your existing render loop:
robot.update(Math.min(clock.getDelta(), 0.1));

// When gameplay begins/ends movement:
robot.setAnimation("Move");
robot.setAnimation("Idle");

// When removing the instance:
scene.remove(robot.root);
robot.dispose();
```

Plain Three.js callers should skip updates when paused, hidden or reduced motion
is requested. `stop()` / `start()` freeze and resume clip clocks and blend progress,
even if the render loop keeps calling `update()`. `dispose()` is final cleanup.
Shared geometry/materials belong to the loader and are not disposed
by the controller.

## Model and animation conventions

- Local Y is up; local Y = 0 is ground; forward is -Z; X/Z origins are centered.
- Rest footprints are at most 0.86 × 0.86 units, inside a 0.94-unit board tile.
  Sampled animation envelopes also stay within 0.94 × 0.94, with height below 1.3.
- Clips animate **in place**. Neither clip translates the scene or root bone.
  Gameplay owns travel, turns and tile timing; adjust `playbackRate` to suit speed.
- `Move` expresses each character's locomotion. Its pace is stylized rather than
  calibrated to a fixed number of tiles per second.
- Rigid mechanical parts use single-bone weights; Noodle's spring blends between
  its fixed lower anchor and moving head. Legs use baked two-bone IK solutions.
- Feet remain level during stance. Low-poly tire/tread interpolation is checked
  within a 0.003-unit ground tolerance.
- Source parts and bevel modifiers remain editable. Runtime meshes are joined by
  material, retaining weights, to keep draw calls low (6–9 meshes per robot).
- Clip lengths vary by personality; all exports use the same `Idle` / `Move` names.
  No root motion or game-state behavior is embedded in the assets.

## Regenerate and validate

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python assets/robots/crew/generate.py
python3 assets/robots/crew/build-gallery.py
node assets/robots/crew/validate.mjs
node_modules/.bin/prettier --write public/models/robots/manifest.json assets/robots/crew/validation.json public/robots/lineup.html
node_modules/.bin/vitest run lib/robot-animation.test.ts
zip -j assets/robots/crew/factory-misfits-glb.zip public/models/robots/*.glb public/models/robots/manifest.json assets/robots/crew/README.md lib/robot-animation.ts
```

Use Blender 4.4+ on other platforms. No external Blender assets or Python packages
are required. `-- --only bolt,gizmo` renders only those previews while updating all
exports. `-- --skip-renders` updates exports and source only. Modeling is in
`generate.py`; rigging, gait profiles and baked animation are in `rig.py`.
Generation overwrites generated assets, so edit the scripts to retain changes
across regeneration. Manual `.blend` edits are not read back into the generator.

Validation loads all ten GLBs using the project's `GLTFLoader`, checks unique
roster IDs/colors, normals, normalized skin weights, rest bounds, centered origins,
ground contact, self-contained resources and both clips. It checks loop endpoints,
in-place root bones and 49 sampled poses per clip for ground contact and tile fit.
Controller tests cover independent skeletons, interrupted and stopped blends,
effect replay, looping and speed. The web preview is also checked with real browser
playback.
