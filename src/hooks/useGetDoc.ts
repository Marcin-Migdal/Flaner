import { getDocs, query, collection, QueryConstraint, QueryDocumentSnapshot, DocumentData, QuerySnapshot } from "firebase/firestore";
import { ToastHandler } from "@Marcin-Migdal/morti-component-library";
import { useEffect, useState } from "react";

import { DOCUMENTS } from "@utils/enums";
import { fb } from "@firebase/firebase";

interface IUseGetDoc {
    document: DOCUMENTS;
    queryConstraints?: QueryConstraint[];
    toastHandler: ToastHandler | null;
}

interface IData<T extends DocumentData> {
    doc: QueryDocumentSnapshot<DocumentData, T>[];
    querySnapshot?: QuerySnapshot<DocumentData, T>;
    status: DataStatusTypes;
}

type DataStatusTypes = "init" | "loaded" | "loading" | "error";

export const useGetDoc = <T extends DocumentData>({ document, queryConstraints = [], toastHandler }: IUseGetDoc) => {
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
            const querySnapshot = await getDocs(query(collection(fb.firestore, document), ...queryConstraints));

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
