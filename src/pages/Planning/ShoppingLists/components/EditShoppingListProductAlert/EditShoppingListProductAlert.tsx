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
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components";
import { useAppDispatch, useAppSelector } from "@hooks";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, useGetProductsQuery } from "@services/Products";
import { Unit, useGetUnitsQuery } from "@services/Units";
import { addToast, selectAuthorization } from "@slices";

import {
  ShoppingListProduct,
  UpdateShoppingListProduct,
  useEditShoppingListProductMutation,
} from "@services/ShoppingListsProduct";

import { constructFlanerApiErrorContent } from "@services/helpers";
import { FlanerApiErrorData } from "@utils/error-classes";
import {
  ShoppingListProductState,
  ShoppingListProductSubmitState,
  initShoppingListProductValues,
  shoppingListProductValidationSchema,
} from "@utils/formik-configs/";

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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const [editShoppingListProduct] = useEditShoppingListProductMutation();

  const handleSubmit = async (formState: ShoppingListProductSubmitState) => {
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

    const { error } = await editShoppingListProduct({
      shoppingListId: shoppingListId,
      shoppingListProductId: shoppingListProduct.id,
      payload: payload,
    });

    if (!error) {
      dispatch(addToast({ message: "shoppingLists.shoppingListProductEdited" }));
      handleClose();
    } else {
      formik.setErrors(constructFlanerApiErrorContent(error as FlanerApiErrorData).formErrors);
    }
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
      header={t("shoppingLists.editShoppingListProduct")}
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText={t("common.actions.edit")}
      onConfirm={formik.submitForm}
      declineBtnText={t("common.actions.close")}
      onDecline={handleCloseAlert}
    >
      <ContentWrapper query={productCategoriesQuery}>
        {({ data: productCategoriesOptions }) => (
          <Form formik={formik} disableSubmitOnEnter>
            {({ values, errors, registerChange, registerBlur }) => (
              <>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown<any>
                  {...registerBlur<"category", DropdownChangeEvent<ProductCategory>>("category")}
                  disabled={!productCategoriesQuery.isSuccess}
                  placeholder={t("products.category")}
                  options={productCategoriesOptions}
                  labelKey="name"
                  valueKey="id"
                  error={t((errors.category as string) || "")}
                />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown<any>
                  {...registerBlur<"product", DropdownChangeEvent<Product>>("product")}
                  disabled={!values.category || productOptions?.length === 0}
                  placeholder={t("products.entity")}
                  options={productOptions || []}
                  labelKey="name"
                  valueKey="id"
                  error={t((errors.product as string) || "")}
                />
                <div className="flex g-2-rem">
                  <NumberField
                    {...registerChange("amount")}
                    classNamesObj={{ container: "flex-8" }}
                    placeholder={t("common.fields.amount")}
                    error={t(errors.amount || "")}
                  />
                  {unitsOptions && unitsOptions.length > 0 && (
                    <Dropdown
                      {...registerBlur<"unit", DropdownChangeEvent<Unit>>("unit")}
                      classNamesObj={{ container: "flex-4" }}
                      placeholder={t("common.fields.unit")}
                      options={unitsOptions}
                      labelKey="name"
                      valueKey="id"
                      error={t((errors.unit as string) || "")}
                    />
                  )}
                </div>
                <Textarea
                  {...registerChange("description")}
                  placeholder={t("common.fields.description")}
                  error={t(errors.description || "")}
                />
              </>
            )}
          </Form>
        )}
      </ContentWrapper>
    </Alert>
  );
};
