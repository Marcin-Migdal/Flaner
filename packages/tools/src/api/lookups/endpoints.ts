// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/lookup_materials.md, lookup_types.md, lookup_colors.md (keep their Write flows / Queries in sync).
import { collection, doc, getDocs, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import { isSameName } from "../../utils/filamentCatalog";
import type {
  AddLookupColorInput,
  AddLookupMaterialInput,
  AddLookupTypeInput,
  LookupColor,
  LookupMaterial,
  LookupType,
} from "./types";

export const lookupRefs = {
  materials: () =>
    collection(fb.firestore, "lookup_materials").withConverter(firestoreConverter<LookupMaterial>()),
  material: (id: string) =>
    doc(fb.firestore, "lookup_materials", id).withConverter(firestoreConverter<LookupMaterial>()),
  types: () =>
    collection(fb.firestore, "lookup_types").withConverter(firestoreConverter<LookupType>()),
  type: (id: string) =>
    doc(fb.firestore, "lookup_types", id).withConverter(firestoreConverter<LookupType>()),
  colors: () =>
    collection(fb.firestore, "lookup_colors").withConverter(firestoreConverter<LookupColor>()),
  color: (id: string) =>
    doc(fb.firestore, "lookup_colors", id).withConverter(firestoreConverter<LookupColor>()),
};

export const fetchLookupMaterials = async (userId: string): Promise<LookupMaterial[]> => {
  const q = query(lookupRefs.materials(), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
};

export const fetchLookupTypes = async (userId: string): Promise<LookupType[]> => {
  const q = query(lookupRefs.types(), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
};

export const fetchLookupColors = async (userId: string): Promise<LookupColor[]> => {
  const q = query(lookupRefs.colors(), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
};

// Lookup identity (`isSameName`): names compare trimmed and case-insensitive, a type within its material,
// a colour within its material + type. Adds match it in JS over the user's docs (a lookup list is small) and
// deletes remove every matching doc, so case-duplicates written before this rule never survive a delete.

const isMaterialOf = (data: { materialName: string }, materialName: string) =>
  isSameName(data.materialName, materialName);

const isTypeOf = (data: { materialName: string; typeName: string }, materialName: string, typeName: string) =>
  isMaterialOf(data, materialName) && isSameName(data.typeName, typeName);

export const addLookupMaterial = async (userId: string, input: AddLookupMaterialInput): Promise<string> => {
  const name = input.name.trim();
  const existing = (await getDocs(query(lookupRefs.materials(), where("userId", "==", userId)))).docs.find((d) =>
    isSameName(d.data().name, name),
  );
  if (existing) return existing.id;

  const newDocRef = doc(lookupRefs.materials());
  await setDoc(newDocRef, { id: newDocRef.id, userId, name, createdAt: Date.now() });
  return newDocRef.id;
};

export const addLookupType = async (userId: string, input: AddLookupTypeInput): Promise<string> => {
  const materialName = input.materialName.trim();
  const name = input.name.trim();
  const existing = (await getDocs(query(lookupRefs.types(), where("userId", "==", userId)))).docs.find(
    (d) => isMaterialOf(d.data(), materialName) && isSameName(d.data().name, name),
  );
  if (existing) return existing.id;

  const newDocRef = doc(lookupRefs.types());
  await setDoc(newDocRef, { id: newDocRef.id, userId, materialName, name, createdAt: Date.now() });
  return newDocRef.id;
};

/** Adds a colour, or updates the hex of the existing one. */
export const addLookupColor = async (userId: string, input: AddLookupColorInput): Promise<string> => {
  const materialName = input.materialName.trim();
  const typeName = input.typeName.trim();
  const name = input.name.trim();
  const hex = input.hex.trim();
  const existing = (await getDocs(query(lookupRefs.colors(), where("userId", "==", userId)))).docs.find(
    (d) => isTypeOf(d.data(), materialName, typeName) && isSameName(d.data().name, name),
  );
  if (existing) {
    if (existing.data().hex !== hex) {
      await updateDoc(lookupRefs.color(existing.id), { hex });
    }
    return existing.id;
  }

  const newDocRef = doc(lookupRefs.colors());
  await setDoc(newDocRef, { id: newDocRef.id, userId, materialName, typeName, name, hex, createdAt: Date.now() });
  return newDocRef.id;
};

/** Deletes the material and its types and colours (atomic batch). */
export const deleteLookupMaterial = async (userId: string, materialName: string): Promise<void> => {
  const [materialsSnap, typesSnap, colorsSnap] = await Promise.all([
    getDocs(query(lookupRefs.materials(), where("userId", "==", userId))),
    getDocs(query(lookupRefs.types(), where("userId", "==", userId))),
    getDocs(query(lookupRefs.colors(), where("userId", "==", userId))),
  ]);

  const batch = writeBatch(fb.firestore);
  materialsSnap.docs.filter((d) => isSameName(d.data().name, materialName)).forEach((d) => batch.delete(d.ref));
  typesSnap.docs.filter((d) => isMaterialOf(d.data(), materialName)).forEach((d) => batch.delete(d.ref));
  colorsSnap.docs.filter((d) => isMaterialOf(d.data(), materialName)).forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

/** Deletes the type and its colours (atomic batch). */
export const deleteLookupType = async (userId: string, materialName: string, typeName: string): Promise<void> => {
  const [typesSnap, colorsSnap] = await Promise.all([
    getDocs(query(lookupRefs.types(), where("userId", "==", userId))),
    getDocs(query(lookupRefs.colors(), where("userId", "==", userId))),
  ]);

  const batch = writeBatch(fb.firestore);
  typesSnap.docs
    .filter((d) => isMaterialOf(d.data(), materialName) && isSameName(d.data().name, typeName))
    .forEach((d) => batch.delete(d.ref));
  colorsSnap.docs.filter((d) => isTypeOf(d.data(), materialName, typeName)).forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

export const deleteLookupColor = async (
  userId: string,
  materialName: string,
  typeName: string,
  name: string,
): Promise<void> => {
  const colorsSnap = await getDocs(query(lookupRefs.colors(), where("userId", "==", userId)));

  const batch = writeBatch(fb.firestore);
  colorsSnap.docs
    .filter((d) => isTypeOf(d.data(), materialName, typeName) && isSameName(d.data().name, name))
    .forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
