import roster from "@/lib/robots.json";

const legacyModels: Record<string, string> = {
  Vector: "glitch",
  Rivet: "gizmo",
};

// Hot reload can retain demo games and playback frames from before modelId
// existed. Resolve those appearances without resetting any gameplay state.
export function getRobotAppearance(robot: { modelId?: string; name: string }) {
  const model =
    roster.find((entry) => entry.id === robot.modelId) ??
    roster.find((entry) => entry.name === robot.name) ??
    roster.find((entry) => entry.id === legacyModels[robot.name]) ??
    roster[0];
  return { modelId: model.id, name: model.name, color: model.color };
}
