"use client";

import { useEffect, useId, useRef } from "react";

/** The approved artwork and shared gaze from design/roborally-logo. */
export function RoboRallyLogo({ className }: { className?: string }) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const gazeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const gaze = gazeRef.current;
    if (!svg || !gaze) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    const axes = [
      ["x", "vx", "tx"],
      ["y", "vy", "ty"],
    ] as const;
    let frame = 0;
    let last = 0;

    function step(time: number) {
      const dt = Math.min((time - last) / 1000, 0.032);
      last = time;
      const steps = Math.max(1, Math.ceil(dt * 120));

      // One spring: mass 1, stiffness 100, damping 10. Both pupils inherit it.
      for (let i = 0; i < steps; i++) {
        for (const [p, v, t] of axes) {
          motion[v] +=
            ((100 * (motion[t] - motion[p]) - 10 * motion[v]) * dt) / steps;
          motion[p] += (motion[v] * dt) / steps;
        }
      }
      const active = axes.some(
        ([p, v, t]) =>
          Math.abs(motion[t] - motion[p]) > 0.01 || Math.abs(motion[v]) > 0.01,
      );
      if (!active) {
        motion.x = motion.tx;
        motion.y = motion.ty;
        motion.vx = motion.vy = 0;
      }
      gaze!.style.transform = `translate(${Math.max(-20, Math.min(20, motion.x))}px, ${Math.max(-12, Math.min(12, motion.y))}px)`;
      frame = active ? requestAnimationFrame(step) : 0;
    }

    function start() {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      Object.assign(motion, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
      gaze!.style.transform = "translate(0px, 0px)";
    }

    function onPointerMove(event: PointerEvent) {
      if (
        reduce.matches ||
        !fine.matches ||
        document.hidden ||
        event.pointerType === "touch"
      )
        return;
      const matrix = svg!.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      // Always measure from the shared midpoint, never from individual eyes.
      const dx = (point.x - 884.5) / 260;
      const dy = (point.y - 350) / 180;
      const length = Math.hypot(dx, dy);
      const strength = Math.tanh(length);
      motion.tx = length ? (dx / length) * 18 * strength : 0;
      motion.ty = length ? (dy / length) * 10 * strength : 0;
      start();
    }

    function onLeave() {
      if (reduce.matches || !fine.matches) return reset();
      motion.tx = motion.ty = 0;
      start();
    }

    function onVisibilityChange() {
      if (document.hidden) reset();
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", reset);
    reduce.addEventListener("change", reset);
    fine.addEventListener("change", reset);

    return () => {
      reset();
      document.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", reset);
      reduce.removeEventListener("change", reset);
      fine.removeEventListener("change", reset);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="128 218 1310 552"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>RoboRally Reimagined</title>
      <image
        width="1536"
        height="1024"
        href="/brand/roborally-wordmark-base.png"
      />
      <g ref={gazeRef} data-gaze="" aria-hidden="true">
        <rect x="597" y="328" width="34" height="44" rx="9" fill="#151914" />
        <rect x="1138" y="328" width="34" height="44" rx="9" fill="#151914" />
      </g>
    </svg>
  );
}
