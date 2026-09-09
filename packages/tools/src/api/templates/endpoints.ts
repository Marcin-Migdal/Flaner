import { collection, getDocs, query, where, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { FilamentTemplate, TemplateInput } from "./types";
import type { FilamentSpool } from "../spools/types";

export const templateRefs = {
  templates: () => collection(fb.firestore, "templates").withConverter(firestoreConverter<FilamentTemplate>()),
  template: (id: string) => doc(fb.firestore, "templates", id).withConverter(firestoreConverter<FilamentTemplate>()),
  spools: () => collection(fb.firestore, "spools").withConverter(firestoreConverter<FilamentSpool>()),
};

export const fetchTemplates = async (userId: string): Promise<FilamentTemplate[]> => {
  const q = query(templateRefs.templates(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  return items.sort((a, b) => {
    const aSec = a.createdAt?.seconds ?? 0;
    const bSec = b.createdAt?.seconds ?? 0;
    return bSec - aSec;
  });
};

export const addTemplate = async (userId: string, data: TemplateInput): Promise<string> => {
  const colRef = collection(fb.firestore, "templates");
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...data,
    id: newDocRef.id,
    userId,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const editTemplate = async (
  templateId: string,
  data: TemplateInput,
  propagate: boolean = false,
  userId?: string,
): Promise<void> => {
  const ref = doc(fb.firestore, "templates", templateId);
  await updateDoc(ref, {
    material: data.material,
    type: data.type,
    colorName: data.colorName,
    colorHex: data.colorHex,
    defaultWeight: data.defaultWeight,
  });

  if (propagate && userId) {
    const spoolsQuery = query(
      templateRefs.spools(),
      where("userId", "==", userId),
      where("templateId", "==", templateId),
    );
    const snap = await getDocs(spoolsQuery);
    if (!snap.empty) {
      const batch = writeBatch(fb.firestore);
      snap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          material: data.material,
          type: data.type,
          colorName: data.colorName,
          colorHex: data.colorHex,
        });
      });
      await batch.commit();
    }
  }
};

export const deleteTemplate = async (
  templateId: string,
  deleteSpools: boolean = false,
  userId?: string,
): Promise<void> => {
  if (userId) {
    const spoolsQuery = query(
      templateRefs.spools(),
      where("userId", "==", userId),
      where("templateId", "==", templateId),
    );
    const snap = await getDocs(spoolsQuery);
    if (!snap.empty) {
      const batch = writeBatch(fb.firestore);
      snap.docs.forEach((docSnap) => {
        if (deleteSpools) {
          batch.delete(docSnap.ref);
        } else {
          batch.update(docSnap.ref, { templateId: null });
        }
      });
      await batch.commit();
    }
  }
  await deleteDoc(doc(fb.firestore, "templates", templateId));
};

export const fetchAssociatedSpools = async (userId: string, templateId: string): Promise<FilamentSpool[]> => {
  const q = query(
    templateRefs.spools(),
    where("userId", "==", userId),
    where("templateId", "==", templateId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
};
