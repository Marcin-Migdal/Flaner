import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const OWNER = "owner-uid";
const OTHER = "other-uid";

const { as, seed } = useTestEnv();

const spool = (userId: string) => ({
  id: "spool-1",
  userId,
  templateId: "template-1",
  name: "Black PLA",
  initialWeight: 1000,
  currentWeight: 1000,
  isFinished: false,
  finishedAt: null,
  createdAt: 1,
  material: "PLA",
  type: "Basic",
  colorName: "Black",
  colorHex: "#000000",
});

const template = (userId: string) => ({
  id: "template-1",
  userId,
  material: "PLA",
  type: "Basic",
  colorName: "Black",
  colorHex: "#000000",
  defaultWeight: 1000,
  createdAt: 1,
});

describe("spools/{spoolId}", () => {
  it("lets the owner add, query, edit and finish spools", async () => {
    const db = as(OWNER);

    await assertSucceeds(setDoc(doc(db, "spools", "spool-1"), { ...spool(OWNER), createdAt: serverTimestamp() }));
    await assertSucceeds(getDocs(query(collection(db, "spools"), where("userId", "==", OWNER))));
    await assertSucceeds(updateDoc(doc(db, "spools", "spool-1"), { name: "Renamed" }));
    await assertSucceeds(
      updateDoc(doc(db, "spools", "spool-1"), { currentWeight: 0, isFinished: true, finishedAt: serverTimestamp() }),
    );
  });

  it("hides spools from other users and blocks creating them for someone else", async () => {
    await seed({ "spools/spool-1": spool(OWNER) });
    const db = as(OTHER);

    await assertFails(getDoc(doc(db, "spools", "spool-1")));
    await assertFails(getDocs(query(collection(db, "spools"), where("userId", "==", OWNER))));
    await assertFails(updateDoc(doc(db, "spools", "spool-1"), { name: "Mine" }));
    await assertFails(setDoc(doc(db, "spools", "spool-2"), spool(OWNER)));
  });

  it("accepts the record / undo print transactions (recordSpoolUsage, undoLastPrint)", async () => {
    await seed({ "spools/spool-1": spool(OWNER) });
    const db = as(OWNER);
    const spoolRef = doc(db, "spools", "spool-1");
    const printRef = doc(db, "spools/spool-1/prints", "print-1");

    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(spoolRef);
        transaction.update(spoolRef, { currentWeight: 980, isFinished: false, finishedAt: null });
        transaction.set(printRef, { id: "print-1", usedWeight: 20, createdAt: serverTimestamp() });
      }),
    );
    await assertSucceeds(getDocs(query(collection(db, "spools/spool-1/prints"), orderBy("createdAt", "desc"), limit(1))));
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(spoolRef);
        transaction.update(spoolRef, { currentWeight: 1000, isFinished: false, finishedAt: null });
        transaction.delete(printRef);
      }),
    );
  });

  it("accepts deleting a spool with its print history (deleteSpool)", async () => {
    await seed({
      "spools/spool-1": spool(OWNER),
      "spools/spool-1/prints/print-1": { id: "print-1", usedWeight: 20, createdAt: 1 },
    });
    const db = as(OWNER);
    const batch = writeBatch(db);
    batch.delete(doc(db, "spools/spool-1/prints", "print-1"));
    batch.delete(doc(db, "spools", "spool-1"));

    await assertSucceeds(batch.commit());
  });

  it("hides print history from other users", async () => {
    await seed({
      "spools/spool-1": spool(OWNER),
      "spools/spool-1/prints/print-1": { id: "print-1", usedWeight: 20, createdAt: 1 },
    });

    await assertFails(getDocs(collection(as(OTHER), "spools/spool-1/prints")));
    await assertFails(setDoc(doc(as(OTHER), "spools/spool-1/prints", "print-2"), { id: "print-2", usedWeight: 5 }));
  });

  it.todo("owned-G1: blocks handing a spool / template / lookup over to another user (userId change)");
});

describe("templates/{templateId}", () => {
  it("lets the owner add, query and edit templates, propagating to spools (updateTemplate)", async () => {
    await seed({ "spools/spool-1": spool(OWNER) });
    const db = as(OWNER);

    await assertSucceeds(setDoc(doc(db, "templates", "template-1"), { ...template(OWNER), createdAt: serverTimestamp() }));
    await assertSucceeds(getDocs(query(collection(db, "templates"), where("userId", "==", OWNER))));
    await assertSucceeds(updateDoc(doc(db, "templates", "template-1"), { colorName: "White", colorHex: "#ffffff" }));
    await assertSucceeds(
      getDocs(
        query(collection(db, "spools"), where("userId", "==", OWNER), where("templateId", "==", "template-1")),
      ),
    );
    const batch = writeBatch(db);
    batch.update(doc(db, "spools", "spool-1"), { colorName: "White", colorHex: "#ffffff" });
    await assertSucceeds(batch.commit());
  });

  it("accepts deleteTemplate detaching the owner's spools", async () => {
    await seed({ "templates/template-1": template(OWNER), "spools/spool-1": spool(OWNER) });
    const db = as(OWNER);
    const batch = writeBatch(db);
    batch.update(doc(db, "spools", "spool-1"), { templateId: null });
    await assertSucceeds(batch.commit());

    await assertSucceeds(deleteDoc(doc(db, "templates", "template-1")));
  });

  it("hides templates from other users", async () => {
    await seed({ "templates/template-1": template(OWNER) });

    await assertFails(getDoc(doc(as(OTHER), "templates", "template-1")));
    await assertFails(deleteDoc(doc(as(OTHER), "templates", "template-1")));
  });
});

describe("lookup_materials / lookup_types / lookup_colors", () => {
  const material = { id: "m1", userId: OWNER, name: "PLA", createdAt: 1 };
  const type = { id: "t1", userId: OWNER, materialName: "PLA", name: "Silk", createdAt: 1 };
  const color = { id: "c1", userId: OWNER, materialName: "PLA", typeName: "Silk", name: "Gold", hex: "#ffd700", createdAt: 1 };

  it("accepts the idempotent add flows (query by name, then set)", async () => {
    const db = as(OWNER);

    await assertSucceeds(
      getDocs(query(collection(db, "lookup_materials"), where("userId", "==", OWNER), where("name", "==", "PLA"), limit(1))),
    );
    await assertSucceeds(setDoc(doc(db, "lookup_materials", "m1"), { ...material, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "lookup_types", "t1"), { ...type, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "lookup_colors", "c1"), { ...color, createdAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "lookup_colors", "c1"), { hex: "#000000" }));
  });

  it("accepts the cascade delete batch (deleteLookupMaterial)", async () => {
    await seed({ "lookup_materials/m1": material, "lookup_types/t1": type, "lookup_colors/c1": color });
    const db = as(OWNER);

    await assertSucceeds(getDocs(query(collection(db, "lookup_types"), where("userId", "==", OWNER))));
    await assertSucceeds(getDocs(query(collection(db, "lookup_colors"), where("userId", "==", OWNER))));
    const batch = writeBatch(db);
    batch.delete(doc(db, "lookup_materials", "m1"));
    batch.delete(doc(db, "lookup_types", "t1"));
    batch.delete(doc(db, "lookup_colors", "c1"));
    await assertSucceeds(batch.commit());
  });

  it("hides lookups from other users and blocks creating them for someone else", async () => {
    await seed({ "lookup_materials/m1": material, "lookup_types/t1": type, "lookup_colors/c1": color });
    const db = as(OTHER);

    await assertFails(getDoc(doc(db, "lookup_materials", "m1")));
    await assertFails(getDocs(query(collection(db, "lookup_types"), where("userId", "==", OWNER))));
    await assertFails(deleteDoc(doc(db, "lookup_colors", "c1")));
    await assertFails(setDoc(doc(db, "lookup_materials", "m2"), { ...material, id: "m2" }));
  });
});
