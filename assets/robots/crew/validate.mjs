import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { AnimationMixer, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const root = new URL("../../../", import.meta.url);
const roster = JSON.parse(fs.readFileSync(new URL("lib/robots.json", root)));
const report = [];
assert.equal(roster.length, 10);
assert.equal(new Set(roster.map((robot) => robot.id)).size, 10);
assert.equal(new Set(roster.map((robot) => robot.color)).size, 10);

for (const robot of roster) {
  const bytes = fs.readFileSync(
    new URL(`public/models/robots/${robot.id}.glb`, root),
  );
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const bounds = new Box3().setFromObject(gltf.scene, true);
  const size = bounds.getSize(new Vector3());
  let meshes = 0;
  let triangles = 0;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    triangles += object.geometry.index.count / 3;
    assert.ok(object.geometry.attributes.normal, `${robot.id}: normals`);
    assert.ok(object.isSkinnedMesh, `${robot.id}: skinned moving parts`);
    const weights = object.geometry.attributes.skinWeight;
    for (let vertex = 0; vertex < weights.count; vertex++) {
      const total =
        weights.getX(vertex) +
        weights.getY(vertex) +
        weights.getZ(vertex) +
        weights.getW(vertex);
      assert.ok(
        Math.abs(total - 1) < 0.00001,
        `${robot.id}: normalized skin weights`,
      );
    }
  });
  assert.equal(json.scenes.length, 1, `${robot.id}: robot scene only`);
  assert.equal(json.skins.length, 1, `${robot.id}: one mechanical skeleton`);
  assert.ok(
    ![...(json.buffers ?? []), ...(json.images ?? [])].some((item) => item.uri),
    `${robot.id}: no external dependencies`,
  );
  assert.ok(Math.abs(bounds.min.y) < 0.00001, `${robot.id}: ground contact`);
  assert.ok(
    size.x <= 0.86001 && size.z <= 0.86001 && size.y <= 1.23001,
    `${robot.id}: tile footprint and height`,
  );
  assert.ok(
    Math.abs(bounds.min.x + bounds.max.x) < 0.00001 &&
      Math.abs(bounds.min.z + bounds.max.z) < 0.00001,
    `${robot.id}: centered origin`,
  );
  assert.deepEqual(gltf.animations.map((clip) => clip.name).sort(), [
    "Idle",
    "Move",
  ]);
  const mixer = new AnimationMixer(gltf.scene);
  const animationReport = {};
  for (const clip of gltf.animations) {
    // Compare actual final keyframes, not a mixer time that wraps to the start.
    for (const track of clip.tracks) {
      const count = track.getValueSize();
      const first = track.values.slice(0, count);
      const last = track.values.slice(-count);
      let error = 0;
      if (track.ValueTypeName === "quaternion") {
        const dot = first.reduce(
          (sum, value, index) => sum + value * last[index],
          0,
        );
        error = Math.abs(1 - Math.abs(dot));
      } else {
        error = Math.max(
          ...first.map((value, index) => Math.abs(value - last[index])),
        );
      }
      assert.ok(
        error < 0.00001,
        `${robot.id}/${clip.name}: seamless ${track.name}`,
      );
    }
    mixer.stopAllAction();
    mixer.clipAction(clip).play();
    const envelope = new Box3();
    let maxGroundError = 0;
    let firstPose;
    let changes = false;
    // Sample intermediate frames too, covering interpolation between baked keys.
    for (let frame = 0; frame < 49; frame++) {
      mixer.setTime((clip.duration * frame) / 49);
      gltf.scene.updateMatrixWorld(true);
      const poseBounds = new Box3().setFromObject(gltf.scene, true);
      envelope.union(poseBounds);
      maxGroundError = Math.max(maxGroundError, Math.abs(poseBounds.min.y));
      const pose = [];
      gltf.scene.traverse((object) => {
        if (object.isBone) pose.push(...object.matrixWorld.elements);
      });
      if (!firstPose) firstPose = pose;
      else
        changes ||= pose.some(
          (value, index) => Math.abs(value - firstPose[index]) > 0.0001,
        );
      const anchor = gltf.scene.getObjectByName("Root");
      assert.ok(
        anchor.position.length() < 0.00001,
        `${robot.id}/${clip.name}: in-place root`,
      );
    }
    const animatedSize = envelope.getSize(new Vector3());
    assert.ok(changes, `${robot.id}/${clip.name}: moving bones`);
    assert.ok(
      maxGroundError < 0.003,
      `${robot.id}/${clip.name}: grounded feet/rollers (${maxGroundError})`,
    );
    assert.ok(
      animatedSize.x < 0.94 && animatedSize.z < 0.94 && animatedSize.y < 1.3,
      `${robot.id}/${clip.name}: animated tile envelope`,
    );
    animationReport[clip.name] = {
      duration: +clip.duration.toFixed(3),
      envelope: animatedSize.toArray().map((value) => +value.toFixed(3)),
      groundTolerance: +maxGroundError.toFixed(5),
    };
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);
  report.push({
    id: robot.id,
    triangles,
    meshes,
    bytes: bytes.length,
    size: size.toArray().map((value) => +value.toFixed(3)),
    animations: animationReport,
  });
}
const output = new URL("validation.json", import.meta.url);
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.table(report);
console.log(
  `Validated ten skinned models and twenty looping clips. Report: ${fileURLToPath(output)}`,
);
