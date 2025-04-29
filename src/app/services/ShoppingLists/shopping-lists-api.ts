import { Timestamp } from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { COLLECTIONS } from "../../../utils/enums";
import { firestoreApi } from "../api";
import { CreateShoppingList, FirestoreShoppingList, ShoppingList, UpdateShoppingList } from "./shopping-lists-types";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  editCollectionDocument,
  getCollectionDataWithId,
  getCollectionFilteredDocuments,
  getRtkTags,
} from "../../../utils/helpers";

export const shoppingListsApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getShoppingList: build.query<ShoppingList[], { currentUserUid: string | undefined }>({
      async queryFn(params) {
        try {
          const { currentUserUid } = params;

          if (!currentUserUid) {
            throw new Error("Error occurred while loading users");
          }

          const snap = await getCollectionFilteredDocuments<FirestoreShoppingList>(COLLECTIONS.SHOPPING_LISTS, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading shopping lists" };
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Shopping_Lists"),
    }),

    addShoppingList: build.mutation<null, CreateShoppingList>({
      async queryFn(product) {
        try {
          const id = uuid();
          const now = Timestamp.now();

          const payload: FirestoreShoppingList = {
            ...product,
            createdAt: now,
            updatedAt: now,
          };

          const snap = await getCollectionFilteredDocuments<FirestoreShoppingList>(COLLECTIONS.SHOPPING_LISTS, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.ownerId }],
          });

          if (!snap.empty) {
            throw new Error("Shopping list with this name already exists");
          }

          await addCollectionDocument(COLLECTIONS.SHOPPING_LISTS, id, payload);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding shopping lists" };
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists", id: "List" }];
      },
    }),

    editShoppingList: build.mutation<null, { shoppingListId: string; payload: UpdateShoppingList }>({
      async queryFn({ shoppingListId, payload }) {
        try {
          await editCollectionDocument(COLLECTIONS.SHOPPING_LISTS, shoppingListId, {
            ...payload,
            updatedAt: Timestamp.now(),
          });

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding shopping lists" };
        }
      },
      invalidatesTags: (_result, error, { shoppingListId }) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists", id: shoppingListId }];
      },
    }),

    deleteShoppingList: build.mutation<null, string>({
      async queryFn(shoppingListsId) {
        try {
          await deleteCollectionDocument(COLLECTIONS.SHOPPING_LISTS, shoppingListsId);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting shopping lists" };
        }
      },

      invalidatesTags: (_result, error, shoppingListsId) => {
        if (error) {
          return [];
        }
        return [{ type: "Shopping_Lists", id: shoppingListsId }];
      },
    }),
  }),
});

export const {
  useGetShoppingListQuery,
  useAddShoppingListMutation,
  useEditShoppingListMutation,
  useDeleteShoppingListMutation,
} = shoppingListsApi;
