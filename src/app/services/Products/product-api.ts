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
import { CreateProduct, FirestoreProduct, Product, UpdateProduct } from "./product-types";

export const productApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Product[], { currentUserUid: string | undefined; categoryId: string }>({
      async queryFn({ currentUserUid, categoryId }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const snap = await getCollectionFilteredDocuments<FirestoreProduct>(COLLECTIONS.PRODUCTS, {
            viewAccess: [{ field: "viewAccess", condition: "array-contains", searchValue: currentUserUid }],
            categoryId: [{ field: "categoryId", condition: "==", searchValue: categoryId }],
          });

          return { data: getCollectionDataWithId(snap) };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "products",
          });
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
          const now = getCurrentStringDate();

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
            throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST, "Product");
          }

          await addCollectionDocument(COLLECTIONS.PRODUCTS, id, payload);

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_ADD_ERROR,
            entity: "product",
          });
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
          await editCollectionDocument(COLLECTIONS.PRODUCTS, productId, {
            ...payload,
            updatedAt: getCurrentStringDate(),
          });

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            entity: "product",
          });
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
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR,
            entity: "product",
          });
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
