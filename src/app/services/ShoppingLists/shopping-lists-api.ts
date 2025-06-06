import { v4 as uuid } from "uuid";

import { getRtkError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { COLLECTIONS } from "@utils/enums";
import { FlanerApiError } from "@utils/error-classes";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  editCollectionDocument,
  getCollectionDataWithId,
  getCollectionFilteredDocuments,
  getCurrentStringDate,
  getRtkTags,
} from "@utils/helpers";

import { firestoreApi } from "../api";
import { CreateShoppingList, FirestoreShoppingList, ShoppingList, UpdateShoppingList } from "./shopping-lists-types";

export const shoppingListsApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getShoppingList: build.query<ShoppingList[], { currentUserUid: string | undefined }>({
      async queryFn({ currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const snap = await getCollectionFilteredDocuments<FirestoreShoppingList>(COLLECTIONS.SHOPPING_LISTS, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "shopping lists",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Shopping_Lists"),
    }),

    addShoppingList: build.mutation<null, CreateShoppingList>({
      async queryFn(product) {
        try {
          const id = uuid();
          const now = getCurrentStringDate();

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
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST, "Shopping list");
          }

          await addCollectionDocument(COLLECTIONS.SHOPPING_LISTS, id, payload);

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_ADD_ERROR,
            entity: "shopping list",
          });
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
          const snap = await getCollectionFilteredDocuments<FirestoreShoppingList>(COLLECTIONS.SHOPPING_LISTS, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.currentUserId }],
          });

          if (!snap.empty) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST, "Shopping list");
          }

          await editCollectionDocument(COLLECTIONS.SHOPPING_LISTS, shoppingListId, {
            ...payload,
            updatedAt: getCurrentStringDate(),
          });

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR,
            entity: "shopping list",
          });
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
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            entity: "shopping list",
          });
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
