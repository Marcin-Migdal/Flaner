import { v4 as uuid } from "uuid";

import { COLLECTIONS } from "@utils/enums";

import { firestoreApi } from "../api";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  editCollectionDocument,
  getCollectionDataWithId,
  getCollectionFilteredDocuments,
  getRtkTags,
} from "@utils/helpers";

import { Timestamp } from "firebase/firestore";
import {
  CreateProductCategory,
  FirestoreProductCategory,
  ProductCategory,
  UpdateProductCategory,
} from "./product-categories-types";

export const productCategoriesApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getProductCategories: build.query<ProductCategory[], { currentUserUid: string | undefined }>({
      async queryFn(params) {
        try {
          const { currentUserUid } = params;

          if (!currentUserUid) {
            throw new Error("Error occurred while loading users");
          }

          const snap = await getCollectionFilteredDocuments<FirestoreProductCategory>(COLLECTIONS.CATEGORIES, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading product categories" };
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Product_Categories"),
    }),

    addProductCategory: build.mutation<null, CreateProductCategory>({
      async queryFn(category) {
        try {
          const id = uuid();
          const now = Timestamp.now();

          const payload: FirestoreProductCategory = {
            ...category,
            createdAt: now,
            updatedAt: now,
          };

          await addCollectionDocument(COLLECTIONS.CATEGORIES, id, payload);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding product category" };
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
          await editCollectionDocument(COLLECTIONS.CATEGORIES, categoryId, { ...payload, updatedAt: Timestamp.now() });

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting product category" };
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
          // TODO! what to do with products that where assigned to this category

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting product category" };
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
