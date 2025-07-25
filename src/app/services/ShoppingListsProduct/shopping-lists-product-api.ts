import {
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { getRtkError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { COLLECTIONS } from "@utils/enums";
import { FlanerApiError } from "@utils/error-classes";
import { getCollectionDataWithId, getCurrentStringDate, getRtkTags } from "@utils/helpers";

import {
  CreateShoppingListProduct,
  FirestoreShoppingListProduct,
  ShoppingListProduct,
  UpdateShoppingListProduct,
} from "./shopping-lists-product-types";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";

type GetShoppingListProductsArgs = { shoppingListId: string | null; categoryId: string | undefined };

export const shoppingListProductApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getShoppingListProducts: build.query<ShoppingListProduct[], GetShoppingListProductsArgs>({
      async queryFn({ shoppingListId, categoryId }) {
        try {
          if (!shoppingListId) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_NOT_SELECTED, "Shopping list");
          }

          const collectionReference = collection(
            fb.firestore,
            COLLECTIONS.SHOPPING_LISTS,
            shoppingListId,
            COLLECTIONS.SHOPPING_LISTS_PRODUCTS
          ) as CollectionReference<FirestoreShoppingListProduct, FirestoreShoppingListProduct>;

          const shoppingListProductsSnapshot = await getDocs(
            categoryId ? query(collectionReference, where("category.id", "==", categoryId)) : collectionReference
          );

          return { data: getCollectionDataWithId(shoppingListProductsSnapshot) };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            "shopping list products"
          );
          return getRtkError(error, fallbackError);
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Shopping_Lists_Product"),
    }),

    addShoppingListProduct: build.mutation<null, { shoppingListId: string; payload: CreateShoppingListProduct }>({
      async queryFn({ shoppingListId, payload }) {
        try {
          const id = uuid();
          const now = getCurrentStringDate();

          const fullPayload: FirestoreShoppingListProduct = {
            ...payload,
            createdAt: now,
            updatedAt: now,
          };

          await setDoc(
            doc(fb.firestore, COLLECTIONS.SHOPPING_LISTS, shoppingListId, COLLECTIONS.SHOPPING_LISTS_PRODUCTS, id),
            fullPayload
          );

          return { data: null };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_ADD_ERROR,
            "shopping list product"
          );
          return getRtkError(error, fallbackError);
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists_Product", id: "List" }];
      },
    }),

    editShoppingListProduct: build.mutation<
      null,
      { shoppingListId: string; shoppingListProductId: string; payload: UpdateShoppingListProduct }
    >({
      async queryFn({ shoppingListId, shoppingListProductId, payload }) {
        try {
          await updateDoc(
            doc(
              fb.firestore,
              COLLECTIONS.SHOPPING_LISTS,
              shoppingListId,
              COLLECTIONS.SHOPPING_LISTS_PRODUCTS,
              shoppingListProductId
            ),
            {
              ...payload,
              updatedAt: getCurrentStringDate(),
            }
          );

          return { data: null };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR,
            "shopping list product"
          );
          return getRtkError(error, fallbackError);
        }
      },
      invalidatesTags: (_result, error, { shoppingListProductId }) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists_Product", id: shoppingListProductId }];
      },
    }),

    deleteShoppingListProduct: build.mutation<null, { shoppingListId: string; shoppingListsProductId: string }>({
      async queryFn({ shoppingListId, shoppingListsProductId }) {
        try {
          await deleteDoc(
            doc(
              fb.firestore,
              COLLECTIONS.SHOPPING_LISTS,
              shoppingListId,
              COLLECTIONS.SHOPPING_LISTS_PRODUCTS,
              shoppingListsProductId
            )
          );

          return { data: null };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            "shopping list product"
          );
          return getRtkError(error, fallbackError);
        }
      },

      invalidatesTags: (_result, error, { shoppingListsProductId }) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists_Product", id: shoppingListsProductId }];
      },
    }),
  }),
});

export const {
  useGetShoppingListProductsQuery,
  useAddShoppingListProductMutation,
  useEditShoppingListProductMutation,
  useDeleteShoppingListProductMutation,
} = shoppingListProductApi;
