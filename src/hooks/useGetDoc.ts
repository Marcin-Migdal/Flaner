import { ToastHandler } from "@marcin-migdal/m-component-library";
import { useEffect, useState } from "react";

import {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  QuerySnapshot,
  collection,
  getDocs,
  query,
} from "firebase/firestore";

import { fb } from "@firebase/firebase";
import { COLLECTIONS } from "@utils/enums";

interface IUseGetDoc {
  collectionName: COLLECTIONS;
  queryConstraints?: QueryConstraint[];
  toastHandler: ToastHandler | null;
}

interface IData<T extends DocumentData> {
  doc: QueryDocumentSnapshot<DocumentData, T>[];
  querySnapshot?: QuerySnapshot<DocumentData, T>;
  status: DataStatusTypes;
}

type DataStatusTypes = "init" | "loaded" | "loading" | "error";

export const useGetDoc = <T extends DocumentData>({
  collectionName,
  queryConstraints = [],
  toastHandler,
}: IUseGetDoc) => {
  const [data, setData] = useState<IData<T>>({
    doc: [],
    querySnapshot: undefined,
    status: "init",
  });

  useEffect(() => {
    getDoc();
  }, []);

  const getDoc = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(fb.firestore, collectionName), ...queryConstraints));

      setData({
        doc: querySnapshot.docs as QueryDocumentSnapshot<DocumentData, T>[],
        querySnapshot: querySnapshot as QuerySnapshot<DocumentData, T>,
        status: "loaded",
      });
    } catch (error) {
      setData((prev) => ({ ...prev, status: "error" }));
      toastHandler?.addToast({ type: "failure", message: error.message });
    }
  };

  return { data, refreshData: getDoc };
};
