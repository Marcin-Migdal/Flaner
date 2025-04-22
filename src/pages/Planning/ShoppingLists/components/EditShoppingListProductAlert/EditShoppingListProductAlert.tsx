import {
  Alert,
  AlertOpenState,
  Dropdown,
  DropdownChangeEvent,
  Form,
  NumberField,
  Textarea,
  useForm,
} from "@marcin-migdal/m-component-library";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@hooks/index";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, useGetProductsQuery } from "@services/Products";
import { Unit, useGetUnitsQuery } from "@services/Units";
import { selectAuthorization } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";

import {
  initShoppingListProductValues,
  ShoppingListProductState,
  ShoppingListProductSubmitState,
  shoppingListProductValidationSchema,
} from "@utils/formik-configs/shopping-list-product-formik-config";

import { ContentWrapper } from "@components/ContentWrapper";
import {
  ShoppingListProduct,
  UpdateShoppingListProduct,
  useEditShoppingListProductMutation,
} from "@services/ShoppingListsProduct";

type EditShoppingListProductAlertProps = {
  shoppingListId: string | null;
  alertOpen: AlertOpenState;
  data: ShoppingListProduct | undefined;
  handleClose: () => void;
};

export const EditShoppingListProductAlert = ({
  shoppingListId,
  data: shoppingListProduct,
  handleClose,
  alertOpen,
}: EditShoppingListProductAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const [editShoppingListProduct] = useEditShoppingListProductMutation();

  const handleSubmit = (formState: ShoppingListProductSubmitState) => {
    const { category, product, unit, amount, description } = formState;

    if (!authUser || !shoppingListId || !shoppingListProduct?.id) {
      return;
    }

    const payload: UpdateShoppingListProduct = {
      amount: amount,
      description: description,
      productDetails: {
        id: product.id,
        name: product.name,
      },
      unit: unit,
      category: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
    };

    editShoppingListProduct({
      shoppingListId: shoppingListId,
      shoppingListProductId: shoppingListProduct.id,
      payload: payload,
    }).then(() => {
      handleClose();
      dispatch(addToast({ message: `Shopping list product has been edited` }));
    });
  };

  const formik = useForm<ShoppingListProductState>({
    initialValues: initShoppingListProductValues,
    validationSchema: shoppingListProductValidationSchema,
    onSubmit: (formState: ShoppingListProductSubmitState) => handleSubmit(formState),
  });

  const productCategoriesQuery = useGetProductCategoriesQuery(
    { currentUserUid: authUser?.uid },
    { skip: alertOpen !== AlertOpenState.OPENED }
  );

  const { data: productOptions } = useGetProductsQuery(
    { currentUserUid: authUser?.uid, categoryId: formik.values.category?.id as string },
    { skip: !formik.values.category || alertOpen !== AlertOpenState.OPENED }
  );

  const { data: unitsOptions } = useGetUnitsQuery(undefined, { skip: alertOpen !== AlertOpenState.OPENED });

  useEffect(() => {
    if (
      alertOpen === AlertOpenState.OPENED &&
      shoppingListProduct &&
      productCategoriesQuery.data &&
      productOptions &&
      unitsOptions
    ) {
      formik.setValues({
        amount: shoppingListProduct.amount,
        description: shoppingListProduct.description,
        category: productCategoriesQuery.data.find((item) => item.id === shoppingListProduct.category.id) || null,
        product: productOptions.find((item) => item.id === shoppingListProduct.productDetails.id) || null,
        unit: unitsOptions.find((item) => item.id === shoppingListProduct.unit.id) || null,
      });
    }
  }, [alertOpen, productCategoriesQuery, productOptions, unitsOptions]);

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <Alert
      header="Edit shopping list product"
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText="Edit"
      onConfirm={formik.submitForm}
      declineBtnText="Close"
      onDecline={handleCloseAlert}
    >
      <ContentWrapper query={productCategoriesQuery}>
        {({ data: productCategoriesOptions }) => (
          <Form formik={formik} disableSubmitOnEnter>
            {({ values, registerChange, registerBlur }) => (
              <>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown<any>
                  disabled={!productCategoriesQuery.isSuccess}
                  placeholder="Category"
                  options={productCategoriesOptions}
                  labelKey="name"
                  valueKey="id"
                  {...registerBlur<"category", DropdownChangeEvent<ProductCategory>>("category")}
                />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown<any>
                  disabled={!values.category || productOptions?.length === 0}
                  placeholder="Product"
                  options={productOptions || []}
                  labelKey="name"
                  valueKey="id"
                  {...registerBlur<"product", DropdownChangeEvent<Product>>("product")}
                />
                <div className="flex g-2-rem">
                  <NumberField
                    classNamesObj={{ container: "flex-8" }}
                    placeholder="Amount"
                    {...registerChange("amount")}
                  />
                  {unitsOptions && unitsOptions.length > 0 && (
                    <Dropdown
                      classNamesObj={{ container: "flex-4" }}
                      placeholder="Unit"
                      options={unitsOptions}
                      labelKey="name"
                      valueKey="id"
                      {...registerBlur<"unit", DropdownChangeEvent<Unit>>("unit")}
                    />
                  )}
                </div>
                <Textarea placeholder="Description" {...registerChange("description")} />
              </>
            )}
          </Form>
        )}
      </ContentWrapper>
    </Alert>
  );
};
