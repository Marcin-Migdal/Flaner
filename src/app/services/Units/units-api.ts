import { COLLECTIONS } from "@utils/enums";
import { getCollectionDataWithId, getCollectionDocuments, getRtkTags } from "@utils/helpers";
import { t } from "i18next";

import { getRtkError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { FlanerApiError } from "@utils/error-classes";
import { firestoreApi } from "../api";
import { FirestoreUnit, Unit } from "./units-types";

export const unitApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getUnits: build.query<Unit[], undefined>({
      async queryFn() {
        try {
          const snap = await getCollectionDocuments<FirestoreUnit>(COLLECTIONS.UNITS);

          return { data: getCollectionDataWithId(snap).map((item) => ({ ...item, name: t(`units.${item.name}`) })) };
        } catch (error) {
          const fallbackError = new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR, "units");
          return getRtkError(error, fallbackError);
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Units"),
    }),
  }),
});

export const { useGetUnitsQuery } = unitApi;
