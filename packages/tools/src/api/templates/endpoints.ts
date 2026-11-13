// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/templates.md, spools.md (keep their Write flows / Queries in sync).
import { collection, getDocs, query, where, setDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { deleteInBatches, firestoreConverter } from "@flaner/shared/utils";
import type { FilamentTemplate, TemplateInput } from "./types";
import type { FilamentSpool } from "../spools/types";
import { spoolRefs } from "../spools/endpoints";

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
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
};

export const addTemplate = async (userId: string, data: TemplateInput): Promise<string> => {
  const colRef = collection(fb.firestore, "templates");
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...data,
    id: newDocRef.id,
    userId,
    createdAt: Date.now(),
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
    if (deleteSpools) {
      // Each spool's prints come before the spool: the prints rule reads the spool doc
      const printsSnaps = await Promise.all(snap.docs.map((docSnap) => getDocs(spoolRefs.prints(docSnap.id))));
      await deleteInBatches(
        fb.firestore,
        snap.docs.flatMap((docSnap, index) => [...printsSnaps[index].docs.map((d) => d.ref), docSnap.ref]),
      );
    } else if (!snap.empty) {
      const batch = writeBatch(fb.firestore);
      snap.docs.forEach((docSnap) => batch.update(docSnap.ref, { templateId: null }));
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
