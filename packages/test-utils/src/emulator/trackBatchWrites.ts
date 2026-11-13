import { WriteBatch } from "firebase/firestore";
import { onTestFinished, vi } from "vitest";

/**
 * Spies on every `WriteBatch` write: the largest number of writes one batch received, and how many batches got writes.
 * The emulator does not enforce Firestore's 500-write cap per batch, so specs assert it with this.
 */
export const trackBatchWrites = () => {
  const spies = [
    vi.spyOn(WriteBatch.prototype, "set"),
    vi.spyOn(WriteBatch.prototype, "update"),
    vi.spyOn(WriteBatch.prototype, "delete"),
  ];
  onTestFinished(() => spies.forEach((spy) => spy.mockRestore()));
  // One entry per write: the batch it went to
  const writes = () =>
    spies.flatMap((spy) => spy.mock.contexts).filter((batch): batch is WriteBatch => batch instanceof WriteBatch);

  return {
    maxWritesPerBatch: () => {
      const perBatch = new Map<WriteBatch, number>();
      writes().forEach((batch) => perBatch.set(batch, (perBatch.get(batch) ?? 0) + 1));
      return Math.max(0, ...perBatch.values());
    },
    batchCount: () => new Set(writes()).size,
  };
};
