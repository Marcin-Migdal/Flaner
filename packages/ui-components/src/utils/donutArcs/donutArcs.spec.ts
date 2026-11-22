import { arcTransitionStart, interpolateArcs, layoutArcs, TAU } from "./donutArcs";

const TOP = [
  { id: "food", value: 50 },
  { id: "home", value: 25 },
  { id: "fun", value: 25 },
];
const FOOD_CHILDREN = [
  { id: "groceries", value: 30 },
  { id: "restaurants", value: 10 },
];

const close = (start: number, end: number) => ({ start: expect.closeTo(start), end: expect.closeTo(end) });

describe("donutArcs", () => {
  it("lays segments out clockwise from the top in their given order", () => {
    expect(layoutArcs(TOP)).toEqual({
      food: close(0, Math.PI),
      home: close(Math.PI, 1.5 * Math.PI),
      fun: close(1.5 * Math.PI, TAU),
    });
  });

  it("starts a drill-down with the children packed into the parent's slice", () => {
    const shown = layoutArcs(TOP);

    const from = arcTransitionStart(shown, FOOD_CHILDREN, { drillInto: "food" });

    expect(from.groceries).toEqual(close(0, 0.75 * Math.PI));
    expect(from.restaurants).toEqual(close(0.75 * Math.PI, Math.PI));
  });

  it("starts going back with the drilled parent filling the circle and its siblings collapsed at the edges", () => {
    const shown = layoutArcs(FOOD_CHILDREN);
    const top = [{ id: "home", value: 25 }, ...TOP.slice(0, 1), { id: "fun", value: 25 }];

    const from = arcTransitionStart(shown, top, { backFrom: "food" });

    expect(from).toEqual({
      home: { start: 0, end: 0 },
      food: { start: 0, end: TAU },
      fun: { start: TAU, end: TAU },
    });
  });

  it("keeps the shown angles of segments that stay and grows new ones from nothing", () => {
    const shown = { food: { start: 0, end: 1 } };

    const from = arcTransitionStart(shown, [...TOP, { id: "new", value: 0 }], {});

    expect(from.food).toEqual({ start: 0, end: 1 });
    expect(from.home.end - from.home.start).toBe(0);
  });

  it("interpolates every target segment between its start and end angles", () => {
    const tween = interpolateArcs({ a: { start: 0, end: 2 } }, { a: { start: 1, end: 4 }, b: { start: 4, end: 6 } });

    expect(tween(0)).toEqual({ a: { start: 0, end: 2 }, b: { start: 4, end: 4 } });
    expect(tween(0.5)).toEqual({ a: { start: 0.5, end: 3 }, b: { start: 4, end: 5 } });
    expect(tween(1)).toEqual({ a: { start: 1, end: 4 }, b: { start: 4, end: 6 } });
  });
});
