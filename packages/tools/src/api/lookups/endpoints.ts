import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
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

export const addLookupMaterial = async (
  userId: string,
  input: AddLookupMaterialInput,
): Promise<string> => {
  const trimmedName = input.name.trim();
  const existingList = await fetchLookupMaterials(userId);
  const found = existingList.find((m) => m.name.toLowerCase() === trimmedName.toLowerCase());
  if (found) {
    return found.id;
  }

  const newDocRef = doc(collection(fb.firestore, "lookup_materials"));
  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    name: trimmedName,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const addLookupType = async (
  userId: string,
  input: AddLookupTypeInput,
): Promise<string> => {
  const trimmedMaterial = input.materialName.trim();
  const trimmedName = input.name.trim();

  const existingList = await fetchLookupTypes(userId);
  const found = existingList.find(
    (t) =>
      t.materialName.toLowerCase() === trimmedMaterial.toLowerCase() &&
      t.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  if (found) {
    return found.id;
  }

  const newDocRef = doc(collection(fb.firestore, "lookup_types"));
  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    materialName: trimmedMaterial,
    name: trimmedName,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const addLookupColor = async (
  userId: string,
  input: AddLookupColorInput,
): Promise<string> => {
  const trimmedMaterial = input.materialName.trim();
  const trimmedType = input.typeName.trim();
  const trimmedName = input.name.trim();
  const hex = input.hex.trim();

  const existingList = await fetchLookupColors(userId);
  const found = existingList.find(
    (c) =>
      c.materialName.toLowerCase() === trimmedMaterial.toLowerCase() &&
      c.typeName.toLowerCase() === trimmedType.toLowerCase() &&
      c.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  if (found) {
    if (found.hex !== hex) {
      await updateDoc(doc(fb.firestore, "lookup_colors", found.id), { hex });
    }
    return found.id;
  }

  const newDocRef = doc(collection(fb.firestore, "lookup_colors"));
  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    materialName: trimmedMaterial,
    typeName: trimmedType,
    name: trimmedName,
    hex,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateLookupColorHex = async (
  colorId: string,
  hex: string,
): Promise<void> => {
  await updateDoc(doc(fb.firestore, "lookup_colors", colorId), {
    hex: hex.trim(),
  });
};

export const deleteLookupMaterial = async (
  userId: string,
  materialId: string,
  materialName: string,
): Promise<void> => {
  const lowerMat = materialName.trim().toLowerCase();

  // Find associated types and colors for this user and cascade delete them atomically
  const [typesSnap, colorsSnap] = await Promise.all([
    getDocs(query(lookupRefs.types(), where("userId", "==", userId))),
    getDocs(query(lookupRefs.colors(), where("userId", "==", userId))),
  ]);

  const batch = writeBatch(fb.firestore);

  // Delete the material doc itself
  batch.delete(doc(fb.firestore, "lookup_materials", materialId));

  // Cascade delete matching child types
  typesSnap.docs.forEach((d) => {
    if (d.data().materialName.toLowerCase() === lowerMat) {
      batch.delete(d.ref);
    }
  });

  // Cascade delete matching child colors
  colorsSnap.docs.forEach((d) => {
    if (d.data().materialName.toLowerCase() === lowerMat) {
      batch.delete(d.ref);
    }
  });

  await batch.commit();
};

export const deleteLookupType = async (
  userId: string,
  typeId: string,
  materialName: string,
  typeName: string,
): Promise<void> => {
  const lowerMat = materialName.trim().toLowerCase();
  const lowerType = typeName.trim().toLowerCase();

  const colorsSnap = await getDocs(query(lookupRefs.colors(), where("userId", "==", userId)));

  const batch = writeBatch(fb.firestore);

  // Delete the type doc itself
  batch.delete(doc(fb.firestore, "lookup_types", typeId));

  // Cascade delete matching child colors
  colorsSnap.docs.forEach((d) => {
    const data = d.data();
    if (
      data.materialName.toLowerCase() === lowerMat &&
      data.typeName.toLowerCase() === lowerType
    ) {
      batch.delete(d.ref);
    }
  });

  await batch.commit();
};

export const deleteLookupColor = async (colorId: string): Promise<void> => {
  await deleteDoc(doc(fb.firestore, "lookup_colors", colorId));
};
