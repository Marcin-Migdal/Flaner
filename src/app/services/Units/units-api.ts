import { COLLECTIONS } from "@utils/enums";
import { getCollectionDataWithId, getCollectionDocuments, getRtkTags } from "@utils/helpers";

import { getRtkError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
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
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "units",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Units"),
    }),
  }),
});

export const { useGetUnitsQuery } = unitApi;
