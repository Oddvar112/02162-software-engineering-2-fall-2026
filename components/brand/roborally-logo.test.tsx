import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RoboRallyLogo } from "./roborally-logo";

const queries = new Map<
  string,
  {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  }
>();
let schedule: ReturnType<typeof vi.fn>;
let cancel: ReturnType<typeof vi.fn>;

beforeEach(() => {
  queries.clear();
  schedule = vi.fn(() => 42);
  cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", schedule);
  vi.stubGlobal("cancelAnimationFrame", cancel);
  vi.stubGlobal("matchMedia", (query: string) => {
    const media = {
      matches: query.includes("pointer: fine"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    queries.set(query, media);
    return media;
  });
  vi.stubGlobal(
    "DOMPoint",
    class {
      constructor(
        public x: number,
        public y: number,
      ) {}
      matrixTransform() {
        return { x: this.x, y: this.y };
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mountLogo() {
  const result = render(<RoboRallyLogo />);
  const svg = result.container.querySelector("svg")!;
  Object.defineProperty(svg, "getScreenCTM", {
    value: () => ({ inverse: () => ({}) }),
  });
  return result;
}
function point(pointerType = "mouse") {
  const event = new Event("pointermove");
  Object.assign(event, { pointerType, clientX: 1400, clientY: 100 });
  document.dispatchEvent(event);
}

it("keeps the eyes neutral for touch input and coarse pointers", () => {
  mountLogo();
  point("touch");
  expect(schedule).not.toHaveBeenCalled();
  queries.get("(hover: hover) and (pointer: fine)")!.matches = false;
  point();
  expect(schedule).not.toHaveBeenCalled();
});

it("resets and stops the spring when reduced motion is enabled", () => {
  const { container } = mountLogo();
  point();
  expect(schedule).toHaveBeenCalledOnce();
  const reduce = queries.get("(prefers-reduced-motion: reduce)")!;
  reduce.matches = true;
  reduce.addEventListener.mock.calls[0][1]();
  expect(cancel).toHaveBeenCalledWith(42);
  expect(
    (container.querySelector("[data-gaze]") as SVGElement).style.transform,
  ).toBe("translate(0px, 0px)");
  point();
  expect(schedule).toHaveBeenCalledOnce();
});

it("removes every registered listener and animation frame on unmount", () => {
  const documentAdd = vi.spyOn(document, "addEventListener");
  const documentRemove = vi.spyOn(document, "removeEventListener");
  const { unmount } = mountLogo();
  point();
  unmount();
  expect(cancel).toHaveBeenCalledWith(42);
  for (const event of ["pointermove", "visibilitychange"]) {
    const listener = documentAdd.mock.calls.find(
      ([name]) => name === event,
    )![1];
    expect(documentRemove).toHaveBeenCalledWith(event, listener);
  }
  for (const media of queries.values()) {
    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      media.addEventListener.mock.calls[0][1],
    );
  }
});

it("gives multiple wordmarks independent accessible titles", () => {
  const { container } = render(
    <>
      <RoboRallyLogo />
      <RoboRallyLogo />
    </>,
  );
  const logos = [...container.querySelectorAll("svg")];
  expect(logos[0].getAttribute("aria-labelledby")).not.toBe(
    logos[1].getAttribute("aria-labelledby"),
  );
});
