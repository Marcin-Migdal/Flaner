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

import { COLLECTIONS } from "@utils/enums";
import { getCollectionDataWithId, getCurrentStringDate, getRtkTags } from "@utils/helpers";

import {
  CreateShoppingListProduct,
  FirestoreShoppingListProduct,
  ShoppingListProduct,
  UpdateShoppingListProduct,
} from "./shopping-lists-product-types";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";

export const shoppingListProductApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getShoppingListProducts: build.query<
      ShoppingListProduct[],
      { shoppingListId: string; categoryId: string | undefined }
    >({
      async queryFn({ shoppingListId, categoryId }) {
        try {
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
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading shopping lists product" };
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
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding shopping lists product" };
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
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding shopping lists" };
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
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting shopping lists" };
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
