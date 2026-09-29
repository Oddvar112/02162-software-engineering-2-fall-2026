import { expect, it } from "vitest";
import { getRobotAppearance } from "./robot-appearance";

it.each([
  ["Bolt", "bolt"],
  ["Vector", "glitch"],
  ["Rivet", "gizmo"],
  ["Pixel", "pixel"],
  ["Unknown robot", "bolt"],
])("resolves the legacy robot %s to a shipped model", (name, modelId) => {
  expect(getRobotAppearance({ name }).modelId).toBe(modelId);
  expect(getRobotAppearance({ name, modelId: "missing" }).modelId).toBe(
    modelId,
  );
});

it("preserves an explicitly selected model over a legacy display name", () => {
  expect(
    getRobotAppearance({ name: "Vector", modelId: "noodle" }),
  ).toMatchObject({
    modelId: "noodle",
    name: "Noodle",
  });
});
