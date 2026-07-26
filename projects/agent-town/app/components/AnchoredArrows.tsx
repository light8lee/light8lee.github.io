"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

export type ArrowSpec = {
  from: string;
  to: string;
  label: string;
  active?: boolean;
  tone?: "amber" | "coral" | "aqua" | "blue";
  labelSide?: -1 | 0 | 1;
};

type DrawnArrow = ArrowSpec & {
  x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number;
};

function edgePoint(rect: DOMRect, root: DOMRect, towardX: number, towardY: number) {
  const cx = rect.left - root.left + rect.width / 2;
  const cy = rect.top - root.top + rect.height / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  const scale = Math.min(
    Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(dx),
    Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(dy),
  );
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function AnchoredArrows({ arrows }: { arrows: ArrowSpec[] }) {
  const layerRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState<DrawnArrow[]>([]);
  const markerPrefix = useId().replaceAll(":", "");

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      setDrawn(arrows.flatMap((arrow) => {
        const from = root.querySelector<HTMLElement>(`[data-arrow-node="${arrow.from}"]`);
        const to = root.querySelector<HTMLElement>(`[data-arrow-node="${arrow.to}"]`);
        if (!from || !to) return [];
        const fromRect = from.getBoundingClientRect();
        const toRect = to.getBoundingClientRect();
        const fromCenter = { x: fromRect.left - rootRect.left + fromRect.width / 2, y: fromRect.top - rootRect.top + fromRect.height / 2 };
        const toCenter = { x: toRect.left - rootRect.left + toRect.width / 2, y: toRect.top - rootRect.top + toRect.height / 2 };
        const start = edgePoint(fromRect, rootRect, toCenter.x, toCenter.y);
        const end = edgePoint(toRect, rootRect, fromCenter.x, fromCenter.y);
        const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
        const side = arrow.labelSide ?? 0;
        const offset = 34 * side;
        return [{
          ...arrow,
          x1: start.x, y1: start.y, x2: end.x, y2: end.y,
          labelX: (start.x + end.x) / 2 - (end.y - start.y) / length * offset,
          labelY: (start.y + end.y) / 2 + (end.x - start.x) / length * offset,
        }];
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll<HTMLElement>("[data-arrow-node]").forEach((node) => observer.observe(node));
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [arrows]);

  return <svg ref={layerRef} className="anchored-arrows" aria-hidden="true">
    <defs>{(["amber", "coral", "aqua", "blue"] as const).map((tone) => <marker key={tone} id={`${markerPrefix}-${tone}`} markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 6 L 0 12 z" className={`arrow-marker tone-${tone}`} /></marker>)}</defs>
    {drawn.map((arrow, index) => {
      const tone = arrow.tone ?? "amber";
      return <g key={`${arrow.from}-${arrow.to}-${index}`} className={`anchor-edge tone-${tone} ${arrow.active === false ? "idle" : "active"}`}>
        <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} markerEnd={`url(#${markerPrefix}-${tone})`} />
        <foreignObject x={arrow.labelX - 60} y={arrow.labelY - 16} width="120" height="32"><div className="anchor-label">{arrow.label}</div></foreignObject>
      </g>;
    })}
  </svg>;
}
