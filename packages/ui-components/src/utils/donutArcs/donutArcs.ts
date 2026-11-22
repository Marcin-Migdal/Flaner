import { pie } from "d3-shape";

export const TAU = 2 * Math.PI;

export type ArcAngles = { start: number; end: number };
export type ArcAngleMap = Record<string, ArcAngles>;
export type ArcDatum = { id: string; value: number };

/** What changed between the shown segments and the next ones. */
export type ArcTransition = { drillInto?: string; backFrom?: string };

/** Clockwise from 12 o'clock, in the given order, across `range`. */
export function layoutArcs(items: ArcDatum[], range: ArcAngles = { start: 0, end: TAU }): ArcAngleMap {
  const arcs = pie<ArcDatum>()
    .sort(null)
    .value((item) => item.value)
    .startAngle(range.start)
    .endAngle(range.end)(items);

  return Object.fromEntries(arcs.map((arc) => [arc.data.id, { start: arc.startAngle, end: arc.endAngle }]));
}

/**
 * Angles the next segments start their tween from, so a drill-down reads as the parent slice
 * opening up and Back as the circle closing into the parent again.
 */
export function arcTransitionStart(shown: ArcAngleMap, next: ArcDatum[], transition: ArcTransition): ArcAngleMap {
  const parent = transition.drillInto ? shown[transition.drillInto] : undefined;
  if (parent) return layoutArcs(next, parent);

  const backIndex = next.findIndex((item) => item.id === transition.backFrom);
  if (backIndex >= 0) {
    return Object.fromEntries(
      next.map((item, index) => {
        if (index === backIndex) return [item.id, { start: 0, end: TAU }];
        const edge = index < backIndex ? 0 : TAU;
        return [item.id, { start: edge, end: edge }];
      }),
    );
  }

  const target = layoutArcs(next);
  return Object.fromEntries(
    next.map((item) => [item.id, shown[item.id] ?? { start: target[item.id].start, end: target[item.id].start }]),
  );
}

/** Tween from `from` to every segment of `to`; a segment missing in `from` grows from its start. */
export function interpolateArcs(from: ArcAngleMap, to: ArcAngleMap): (t: number) => ArcAngleMap {
  // Plain lerp: d3-interpolate would pull d3-color into the bundle for two numbers.
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return (t) =>
    Object.fromEntries(
      Object.entries(to).map(([id, end]) => {
        const start = from[id] ?? { start: end.start, end: end.start };
        return [id, { start: lerp(start.start, end.start, t), end: lerp(start.end, end.end, t) }];
      }),
    );
}
