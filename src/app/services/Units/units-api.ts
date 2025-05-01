import { COLLECTIONS } from "@utils/enums";
import { getCollectionDataWithId, getCollectionDocuments, getRtkTags } from "@utils/helpers";

import { firestoreApi } from "../api";
import { FirestoreUnit, Unit } from "./units-types";

export const unitApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getUnits: build.query<Unit[], undefined>({
      async queryFn() {
        try {
          const snap = await getCollectionDocuments<FirestoreUnit>(COLLECTIONS.UNITS);

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading shopping lists" };
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Units"),
    }),
  }),
});

export const { useGetUnitsQuery } = unitApi;
