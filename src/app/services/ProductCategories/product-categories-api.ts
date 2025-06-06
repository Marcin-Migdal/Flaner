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

import {
  CreateProductCategory,
  FirestoreProductCategory,
  ProductCategory,
  UpdateProductCategory,
} from "./product-categories-types";

import { firestoreApi } from "../api";

export const productCategoriesApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getProductCategories: build.query<ProductCategory[], { currentUserUid: string | undefined }>({
      async queryFn({ currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const snap = await getCollectionFilteredDocuments<FirestoreProductCategory>(COLLECTIONS.CATEGORIES, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "product categories",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Product_Categories"),
    }),

    addProductCategory: build.mutation<null, CreateProductCategory>({
      async queryFn(category) {
        try {
          const id = uuid();
          const now = getCurrentStringDate();

          const payload: FirestoreProductCategory = {
            ...category,
            createdAt: now,
            updatedAt: now,
          };

          const snap = await getCollectionFilteredDocuments<FirestoreProductCategory>(COLLECTIONS.CATEGORIES, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.ownerId }],
          });

          if (!snap.empty) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST, "Product category");
          }

          await addCollectionDocument(COLLECTIONS.CATEGORIES, id, payload);

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_ADD_ERROR,
            entity: "product category",
          });
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return [{ type: "Product_Categories", id: "List" }];
      },
    }),

    editProductCategory: build.mutation<null, { categoryId: string; payload: UpdateProductCategory }>({
      async queryFn({ categoryId, payload }) {
        try {
          const snap = await getCollectionFilteredDocuments<FirestoreProductCategory>(COLLECTIONS.CATEGORIES, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.currentUserId }],
          });

          if (!snap.empty) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST, "Product category");
          }

          await editCollectionDocument(COLLECTIONS.CATEGORIES, categoryId, {
            ...payload,
            updatedAt: getCurrentStringDate(),
          });

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR,
            entity: "product category",
          });
        }
      },
      invalidatesTags: (_result, error, { categoryId }) => {
        if (error) {
          return [];
        }
        return [{ type: "Product_Categories", id: categoryId }];
      },
    }),

    deleteProductCategory: build.mutation<null, string>({
      async queryFn(categoryId) {
        try {
          await deleteCollectionDocument(COLLECTIONS.CATEGORIES, categoryId);
          // TODO! show popup where user can choose to delete all products, or select category to which products will be moved

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            entity: "product category",
          });
        }
      },

      invalidatesTags: (_result, error, categoryId) => {
        if (error) {
          return [];
        }
        return [{ type: "Product_Categories", id: categoryId }];
      },
    }),
  }),
});

export const {
  useGetProductCategoriesQuery,
  useAddProductCategoryMutation,
  useEditProductCategoryMutation,
  useDeleteProductCategoryMutation,
} = productCategoriesApi;
