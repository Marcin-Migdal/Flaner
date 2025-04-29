import { v4 as uuid } from "uuid";

import { Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "../../../utils/enums";
import { firestoreApi } from "../api";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  editCollectionDocument,
  getCollectionDataWithId,
  getCollectionFilteredDocuments,
  getRtkTags,
} from "../../../utils/helpers";

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

          const snap = await getCollectionFilteredDocuments<FirestoreProductCategory>(COLLECTIONS.CATEGORIES, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.ownerId }],
          });

          if (!snap.empty) {
            throw new Error("Product category with this name already exists");
          }

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
          // TODO! show popup where user can choose to delete all products, or select category to which products will be moved

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
