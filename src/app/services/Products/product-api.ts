import { Timestamp } from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { COLLECTIONS } from "@utils/enums";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  editCollectionDocument,
  getCollectionDataWithId,
  getCollectionFilteredDocuments,
  getRtkTags,
} from "@utils/helpers";

import { firestoreApi } from "../api";
import { CreateProduct, FirestoreProduct, Product, UpdateProduct } from "./product-types";

export const productApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Product[], { currentUserUid: string | undefined; categoryId: string }>({
      async queryFn({ currentUserUid, categoryId }) {
        try {
          if (!currentUserUid) {
            throw new Error("Error occurred while loading users");
          }

          const snap = await getCollectionFilteredDocuments<FirestoreProduct>(COLLECTIONS.PRODUCTS, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
            categoryId: [{ field: "categoryId", condition: "==", searchValue: categoryId }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading products" };
        }
      },
      providesTags: (result, _err, { categoryId }) => [
        ...getRtkTags(result, "id", "Products", [{ type: "Products", id: categoryId }]),
      ],
    }),

    addProduct: build.mutation<null, CreateProduct>({
      async queryFn(product) {
        try {
          const id = uuid();
          const now = Timestamp.now();

          const payload: FirestoreProduct = {
            ...product,
            createdAt: now,
            updatedAt: now,
          };

          const snap = await getCollectionFilteredDocuments<FirestoreProduct>(COLLECTIONS.PRODUCTS, {
            name: [{ field: "name", condition: "==", searchValue: payload.name }],
            categoryId: [{ field: "categoryId", condition: "==", searchValue: payload.categoryId }],
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: payload.ownerId }],
          });

          if (!snap.empty) {
            throw new Error("Product with this name already exists in this category");
          }

          await addCollectionDocument(COLLECTIONS.PRODUCTS, id, payload);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while adding products" };
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return [{ type: "Products", id: "List" }];
      },
    }),

    editProduct: build.mutation<null, { productId: string; payload: UpdateProduct }>({
      async queryFn({ productId, payload }) {
        try {
          await editCollectionDocument(COLLECTIONS.PRODUCTS, productId, { ...payload, updatedAt: Timestamp.now() });

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting product" };
        }
      },
      invalidatesTags: (_result, error, { productId, payload }) => {
        if (error) {
          return [];
        }

        if (payload.categoryId) {
          return [
            { type: "Products", id: productId },
            { type: "Products", id: payload.categoryId },
          ];
        }

        return [{ type: "Products", id: productId }];
      },
    }),

    deleteProduct: build.mutation<null, string>({
      async queryFn(productId) {
        try {
          await deleteCollectionDocument(COLLECTIONS.PRODUCTS, productId);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting product" };
        }
      },

      invalidatesTags: (_result, error, productId) => {
        if (error) {
          return [];
        }
        return [{ type: "Products", id: productId }];
      },
    }),
  }),
});

export const { useGetProductsQuery, useAddProductMutation, useEditProductMutation, useDeleteProductMutation } =
  productApi;
