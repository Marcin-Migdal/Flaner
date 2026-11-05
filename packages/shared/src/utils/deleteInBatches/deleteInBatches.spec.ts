import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentReference, Firestore } from "firebase/firestore";
import { BATCH_LIMIT, deleteInBatches } from "./deleteInBatches";

const batches: { deleted: string[]; committed: boolean }[] = [];

vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn(() => {
    const batch = { deleted: [] as string[], committed: false };
    batches.push(batch);
    return {
      delete: (ref: { id: string }) => batch.deleted.push(ref.id),
      commit: async () => {
        batch.committed = true;
      },
    };
  }),
}));

const firestore: Firestore = {} as never;
const makeRefs = (count: number): DocumentReference[] =>
  Array.from({ length: count }, (_, index) => ({ id: `doc-${index}` }) as never);

describe("deleteInBatches", () => {
  beforeEach(() => {
    batches.length = 0;
  });

  it("does nothing for an empty list", async () => {
    await deleteInBatches(firestore, []);
    expect(batches).toHaveLength(0);
  });

  it("splits the refs into batches of at most BATCH_LIMIT, keeping the order", async () => {
    await deleteInBatches(firestore, makeRefs(BATCH_LIMIT * 2 + 1));

    expect(batches.map((b) => b.deleted.length)).toEqual([BATCH_LIMIT, BATCH_LIMIT, 1]);
    expect(batches.every((b) => b.committed)).toBe(true);
    expect(batches[1].deleted[0]).toBe(`doc-${BATCH_LIMIT}`);
    expect(batches[2].deleted[0]).toBe(`doc-${BATCH_LIMIT * 2}`);
  });
});
