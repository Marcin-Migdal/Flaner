import { describe, it, expect } from "vitest";
import { firestoreConverter } from "./firestoreConverter";

type TestItem = { id: string; name: string };

describe("firestoreConverter", () => {
  const converter = firestoreConverter<TestItem>();

  it("passes data through in toFirestore", () => {
    const item: TestItem = { id: "123", name: "Flaner" };
    expect(converter.toFirestore(item)).toEqual(item);
  });

  it("extracts data from snapshot in fromFirestore", () => {
    const mockSnapshot = {
      data: () => ({ id: "123", name: "Flaner" }),
    };

    const result = converter.fromFirestore(mockSnapshot as never);
    expect(result).toEqual({ id: "123", name: "Flaner" });
  });
});
