import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/jakubpetergac/code/dtu/software-engineering-2/02162-software-engineering-2-fall-2026";
const SKILL_DIR = "/Users/jakubpetergac/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const TMP_DIR = path.join(workspaceDir, ".codex-presentation-build");
const FINAL_PPTX = path.join(workspaceDir, "presentation-output", "RoboRally_Project_Vision_10_Minutes_v3.pptx");
const RUNTIME_PYTHON = "/Users/jakubpetergac/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const screenshotPath = "/var/folders/p2/wkm4qb8d51s7kpsgr21c6qz80000gn/T/codex-clipboard-7d8cb7d4-a83a-482f-a3ef-5373a9d160d3.png";

const W = 1280;
const H = 720;
const C = {
  bg: "#090E0F",
  surface: "#12191A",
  surface2: "#182123",
  lime: "#B6FF3B",
  cyan: "#45DDF4",
  amber: "#FFC857",
  red: "#FF5C66",
  white: "#F1F5F2",
  muted: "#94A19E",
  grid: "#2A3637",
};
const FONT = "Roboto";
const MONO = "Menlo";

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, x, y, w, h, fill = "none", line = "none", lineWidth = 0, radius = 0) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: line, width: lineWidth },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function text(slide, value, x, y, w, h, size = 24, color = C.white, bold = false, family = FONT, align = "left") {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: family,
    fontSize: size,
    color,
    bold,
    alignment: align,
    verticalAlignment: "middle",
    autoFit: "none",
  };
  return shape;
}

function rule(slide, x, y, w, color = C.grid, width = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: 0.01 },
    fill: "none",
    line: { fill: color, width },
  });
}

function verticalRule(slide, x, y, h, color = C.grid, width = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: 0.01, height: h },
    fill: "none",
    line: { fill: color, width },
  });
}

function header(slide, number, title, accent = C.lime) {
  slide.background.fill = C.bg;
  text(slide, "SYS::RR-02162", 56, 28, 280, 26, 13, accent, true, MONO);
  text(slide, String(number).padStart(2, "0"), 1168, 28, 56, 26, 13, C.muted, true, MONO, "right");
  rule(slide, 56, 61, 1168, C.grid, 1);
  text(slide, title, 56, 78, 1168, 64, 36, C.white, true, FONT);
}

function addNotes(slide, notes) {
  slide.speakerNotes.textFrame.setText(notes);
}

function labeledPoint(slide, number, heading, body, x, y, width, color = C.lime) {
  text(slide, number, x, y, 48, 36, 18, color, true, MONO);
  text(slide, heading, x + 58, y - 3, width - 58, 38, 24, C.white, true, FONT);
  text(slide, body, x + 58, y + 39, width - 58, 72, 18, C.muted, false, FONT);
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.bg;
  text(slide, "SYS::RR-02162 / GROUP E", 64, 48, 600, 30, 14, C.lime, true, MONO);
  rule(slide, 64, 92, 1152, C.grid, 1);
  text(slide, "RoboRally\nOnline", 64, 132, 760, 230, 72, C.white, true, FONT);
  text(slide, "PROJECT VISION + RELEASE 1", 70, 382, 660, 40, 18, C.cyan, true, MONO);
  text(slide, "A digital board game that keeps the chaos and removes the bookkeeping", 70, 448, 780, 92, 26, C.muted, false, FONT);
  text(slide, "> PROGRAM", 916, 176, 280, 38, 22, C.lime, true, MONO, "right");
  text(slide, "> EXECUTE", 916, 244, 280, 38, 22, C.cyan, true, MONO, "right");
  text(slide, "> RESOLVE", 916, 312, 280, 38, 22, C.amber, true, MONO, "right");
  rule(slide, 916, 372, 280, C.grid, 2);
  text(slide, "10 MINUTES", 916, 392, 280, 32, 15, C.muted, true, MONO, "right");
  addNotes(slide, "Welcome everyone. We are Group E, and our project is a web version of RoboRally. Our goal is to keep the social, chaotic feeling of the physical board game while making it easier to start, follow and play remotely. I will focus on the product vision and the player experience, rather than the technical implementation.");
}

// 2. Problem
{
  const slide = presentation.slides.add();
  header(slide, 2, "Why a digital RoboRally?");
  text(slide, "The physical game is difficult to start spontaneously.", 56, 154, 760, 116, 40, C.white, true, FONT);
  rule(slide, 56, 294, 1168, C.grid, 1);
  labeledPoint(slide, "01", "Same room", "Every player needs to meet around one table.", 56, 330, 350, C.red);
  labeledPoint(slide, "02", "Manual bookkeeping", "Cards, checkpoints, damage and turn order need constant tracking.", 438, 330, 350, C.amber);
  labeledPoint(slide, "03", "Rule ambiguity", "One resolution mistake can interrupt the whole round.", 820, 330, 360, C.cyan);
  text(slide, "The friction comes before the fun starts.", 56, 590, 1168, 54, 27, C.lime, true, MONO);
  addNotes(slide, "The main problem is not the game itself. The problem is the friction around it. Everyone must be in the same place, setup takes time, and players must manually track cards, checkpoints, damage and exact execution order. A small mistake can interrupt the round and create an argument about the correct state.");
}

// 3. Vision
{
  const slide = presentation.slides.add();
  header(slide, 3, "Product vision");
  text(slide, "A shared 3D board that feels physical, while the software handles the rules.", 56, 150, 1100, 106, 38, C.white, true, FONT);
  const xs = [56, 350, 644, 938];
  const colors = [C.lime, C.cyan, C.amber, C.red];
  const heads = ["SHARED BOARD", "REMOTE PLAY", "AUTOMATIC RULES", "BOARD-GAME FEEL"];
  const bodies = [
    "One visible state for every player",
    "Friends can join from anywhere",
    "Movement and hazards resolve consistently",
    "Robots remain tactile and readable",
  ];
  for (let i = 0; i < 4; i++) {
    rule(slide, xs[i], 314, 238, colors[i], 4);
    text(slide, heads[i], xs[i], 336, 238, 38, 16, colors[i], true, MONO);
    text(slide, bodies[i], xs[i], 390, 238, 110, 22, C.white, true, FONT);
  }
  text(slide, "The product supports play. It does not replace the uncertainty that makes RoboRally fun.", 56, 574, 1168, 62, 24, C.muted, false, FONT);
  addNotes(slide, "Our vision is a shared 3D board that still feels like a real board game. Players join remotely and see the same game state. The software resolves movement, hazards and progress consistently. It removes administration, but it keeps the uncertainty that creates RoboRally's funniest moments.");
}

// 4. Core experience diagram
{
  const slide = presentation.slides.add();
  header(slide, 4, "What players need to understand");
  const cx = 640, cy = 390;
  box(slide, 455, 318, 370, 138, C.surface2, C.lime, 3, 12);
  text(slide, "SHARED\nBOARD", 485, 335, 310, 100, 34, C.white, true, MONO, "center");
  rule(slide, 250, cy, 205, C.grid, 2);
  rule(slide, 825, cy, 205, C.grid, 2);
  verticalRule(slide, cx, 226, 92, C.grid, 2);
  verticalRule(slide, cx, 456, 62, C.grid, 2);
  text(slide, "ROBOT POSITION\n+ DIRECTION", 56, 330, 194, 102, 20, C.cyan, true, MONO, "center");
  text(slide, "STATUS\n+ PROGRESS", 1030, 330, 194, 102, 20, C.amber, true, MONO, "center");
  text(slide, "CURRENT PHASE", 490, 164, 300, 54, 21, C.red, true, MONO, "center");
  text(slide, "ACTION CARDS", 490, 518, 300, 54, 21, C.lime, true, MONO, "center");
  text(slide, "The board stays central. Everything around it explains what happens next.", 124, 622, 1032, 44, 24, C.muted, false, FONT, "center");
  addNotes(slide, "The board is the shared centre of the experience. Players should immediately see every robot's position and direction. The interface then explains the current phase, public status and checkpoint progress. Action cards replace physical card handling. This lets players concentrate on planning instead of maintaining the game state.");
}

// 5. Player scenario
{
  const slide = presentation.slides.add();
  header(slide, 5, "One round from Alex's perspective");
  rule(slide, 120, 356, 1040, C.grid, 3);
  const steps = [
    ["01", "SEE", "Inspect board state"],
    ["02", "PROGRAM", "Choose five cards"],
    ["03", "LOCK", "Confirm the order"],
    ["04", "RESOLVE", "Watch automatic execution"],
    ["05", "SYNC", "Continue from one result"],
  ];
  const colors = [C.cyan, C.lime, C.amber, C.red, C.cyan];
  for (let i = 0; i < steps.length; i++) {
    const x = 70 + i * 240;
    box(slide, x + 79, 335, 42, 42, colors[i], colors[i], 0, 21);
    text(slide, steps[i][0], x, 216, 200, 36, 18, colors[i], true, MONO, "center");
    text(slide, steps[i][1], x, 254, 200, 44, 21, C.white, true, MONO, "center");
    text(slide, steps[i][2], x, 406, 200, 72, 18, C.muted, false, FONT, "center");
  }
  text(slide, "Chaos remains in the outcome. Ambiguity disappears from the resolution.", 100, 584, 1080, 54, 28, C.white, true, FONT, "center");
  addNotes(slide, "Imagine Alex joining a game. Alex first reads the shared board, then privately chooses five cards and locks the program. Once everyone is ready, the programs reveal and execute in priority order. Board elements activate, progress updates, and every player receives the same resulting state. The outcome can still be chaotic, but the resolution is clear.");
}

// 6. Mockup
{
  const slide = presentation.slides.add();
  header(slide, 6, "Current product mockup");
  const bytes = new Uint8Array(await fs.readFile(screenshotPath));
  box(slide, 72, 150, 1136, 492, C.surface, C.grid, 2, 10);
  slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt: "RoboRally game-screen mockup with shared board, four robots, player list and action cards",
    fit: "contain",
    position: { left: 80, top: 158, width: 1120, height: 476 },
    geometry: "roundRect",
    borderRadius: 8,
  });
  text(slide, "BOARD", 83, 650, 110, 24, 13, C.lime, true, MONO);
  text(slide, "PUBLIC STATUS", 492, 650, 160, 24, 13, C.cyan, true, MONO, "center");
  text(slide, "PRIVATE PROGRAM", 1010, 650, 190, 24, 13, C.amber, true, MONO, "right");
  addNotes(slide, "This screen is a product mockup of the intended player experience. The board occupies the centre, robot directions are visible, player status appears to the side, and the action cards sit close to the play area. The mockup demonstrates the vision. It is not a presentation about Three.js, Next.js or backend architecture.");
}

// 7. Scope
{
  const slide = presentation.slides.add();
  header(slide, 7, "Release 1 scope");
  text(slide, "RELEASE 1", 56, 158, 520, 44, 20, C.lime, true, MONO);
  text(slide, "FUTURE OPTIONS", 704, 158, 520, 44, 20, C.muted, true, MONO);
  rule(slide, 56, 214, 520, C.lime, 4);
  rule(slide, 704, 214, 520, C.grid, 4);
  const now = ["Visible shared game state", "Private card programming", "Automatic execution", "Board element effects", "Synchronized result"];
  const later = ["Different robot types", "Custom programming decks", "Adaptive or changing boards", "Cosmetics and progression"];
  for (let i = 0; i < now.length; i++) {
    text(slide, String(i + 1).padStart(2, "0"), 56, 248 + i * 68, 52, 40, 16, C.lime, true, MONO);
    text(slide, now[i], 120, 245 + i * 68, 456, 44, 22, C.white, true, FONT);
  }
  for (let i = 0; i < later.length; i++) {
    text(slide, String(i + 1).padStart(2, "0"), 704, 248 + i * 68, 52, 40, 16, C.muted, true, MONO);
    text(slide, later[i], 768, 245 + i * 68, 456, 44, 22, C.muted, true, FONT);
  }
  text(slide, "First prove the shared game loop.", 704, 560, 520, 70, 28, C.amber, true, FONT);
  addNotes(slide, "For Release 1, we narrow the vision to one complete shared loop. Players need to see the state, choose cards privately, execute programs automatically, apply board effects and continue from a synchronized result. Robot classes, custom decks, adaptive boards and progression remain possible extensions. We should only commit to them after the core loop works well.");
}

// 8. User stories
{
  const slide = presentation.slides.add();
  header(slide, 8, "Suggested user stories for Release 1");
  const stories = [
    ["01", "SEE SHARED STATE", "Board, robot direction, round and phase"],
    ["02", "PROGRAM PRIVATELY", "Receive and order action cards"],
    ["03", "EXECUTE BY PRIORITY", "Reveal and resolve locked programs"],
    ["04", "APPLY BOARD RULES", "Conveyors, gears, walls, pits and checkpoints"],
    ["05", "TRACK CONSEQUENCES", "Damage and checkpoint progress"],
    ["06", "SYNCHRONIZE RESULTS", "The same state for every player"],
  ];
  for (let i = 0; i < stories.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 56 : 690;
    const contentWidth = col === 0 ? 480 : 464;
    const y = 160 + row * 150;
    text(slide, stories[i][0], x, y, 60, 38, 17, col === 0 ? C.lime : C.cyan, true, MONO);
    text(slide, stories[i][1], x + 70, y - 2, contentWidth, 40, 20, C.white, true, MONO);
    text(slide, stories[i][2], x + 70, y + 44, contentWidth, 56, 18, C.muted, false, FONT);
    rule(slide, x + 70, y + 112, contentWidth, C.grid, 1);
  }
  text(slide, "Together, the stories describe one coherent playable round.", 56, 632, 1168, 38, 22, C.amber, true, FONT);
  addNotes(slide, "These six stories convert the vision into Release 1 work. A player sees the shared state, programs privately, and watches priority-based execution. The game applies board rules, tracks damage and checkpoint progress, and synchronizes the final state. Together they describe one coherent playable round rather than a collection of disconnected features.");
}

// 9. Domain model
{
  const slide = presentation.slides.add();
  header(slide, 9, "Scoped domain model");
  const nodes = {
    game: [520, 152, 240, 58, "GAME", C.lime],
    player: [250, 280, 210, 56, "PLAYER", C.cyan],
    board: [820, 280, 210, 56, "BOARD", C.amber],
    phase: [955, 152, 210, 56, "ROUND / PHASE", C.red],
    program: [90, 430, 210, 56, "PROGRAM", C.lime],
    robot: [340, 430, 210, 56, "ROBOT", C.cyan],
    tile: [730, 430, 210, 56, "TILE", C.amber],
    card: [90, 570, 210, 56, "ACTION CARD", C.lime],
    element: [980, 570, 210, 56, "BOARD ELEMENT", C.amber],
  };
  function connector(x1, y1, x2, y2, label, lx, ly) {
    if (x2 < x1 && y2 > y1) {
      verticalRule(slide, x1, y1, y2 - y1, C.grid, 2);
      rule(slide, x2, y2, x1 - x2, C.grid, 2);
      text(slide, label, lx, ly, 110, 22, 12, C.muted, true, MONO, "center");
      return;
    }
    const connection = slide.shapes.add({
      geometry: "line",
      position: {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.max(0.01, Math.abs(x2 - x1)),
        height: Math.max(0.01, Math.abs(y2 - y1)),
      },
      fill: "none",
      line: { fill: C.grid, width: 2 },
    });
    connection.flipHorizontal = false;
    text(slide, label, lx, ly, 110, 22, 12, C.muted, true, MONO, "center");
  }
  connector(550, 210, 420, 280, "HAS", 435, 234);
  connector(730, 210, 850, 280, "USES", 735, 234);
  connector(760, 181, 955, 181, "TRACKS", 800, 160);
  connector(315, 336, 405, 430, "CONTROLS", 260, 374);
  connector(280, 336, 195, 430, "CREATES", 160, 374);
  connector(195, 486, 195, 570, "CONTAINS", 205, 518);
  connector(460, 458, 730, 458, "OCCUPIES", 540, 438);
  connector(865, 336, 835, 430, "CONTAINS", 850, 374);
  connector(835, 486, 1085, 570, "MAY CONTAIN", 885, 518);
  for (const [, [x, y, w, h, label, color]] of Object.entries(nodes)) {
    box(slide, x, y, w, h, C.surface2, color, 2, 8);
    text(slide, label, x + 10, y + 8, w - 20, h - 16, 17, C.white, true, MONO, "center");
  }
  addNotes(slide, "This scoped model gives the team a shared vocabulary for Release 1. A game has players, a board and a current round or phase. A player creates a program and controls a robot. Programs contain action cards. Robots occupy tiles, while the board contains tiles and board elements. The model stays intentionally small and avoids implementation details.");
}

// 10. Closing
{
  const slide = presentation.slides.add();
  header(slide, 10, "Release 1 success");
  text(slide, "A complete round runs from card selection to a synchronized result without manual rule checking.", 56, 158, 1100, 150, 42, C.white, true, FONT);
  rule(slide, 56, 342, 1168, C.grid, 1);
  text(slide, "READABLE", 56, 382, 260, 38, 18, C.cyan, true, MONO);
  text(slide, "Players understand positions, directions and the current phase.", 56, 426, 500, 78, 22, C.muted, false, FONT);
  text(slide, "RELIABLE", 680, 382, 260, 38, 18, C.lime, true, MONO);
  text(slide, "The game resolves the same rules and state for everyone.", 680, 426, 500, 78, 22, C.muted, false, FONT);
  text(slide, "QUESTIONS?", 56, 584, 1168, 64, 32, C.amber, true, MONO);
  addNotes(slide, "Release 1 succeeds when a complete round runs from private card selection to one synchronized result without manual rule checking. Players should understand what is happening, and the system should resolve the rules consistently. That gives us a strong foundation for every later extension. Thank you. We are ready for questions.");
}

for (let i = 0; i < presentation.slides.items.length; i++) {
  const slide = presentation.slides.items[i];
  const preview = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(TMP_DIR, `preview-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};
const fontPolicy = { basis: "design", families: [FONT, MONO] };
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(FINAL_PPTX)}.validation.json`),
});

console.log(JSON.stringify({ final: FINAL_PPTX, result }, null, 2));
