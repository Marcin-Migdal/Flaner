import {
  Alert,
  AlertOpenState,
  Dropdown,
  DropdownBlurEvent,
  DropdownChangeEvent,
  DropdownValue,
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
import { FlanerApiError } from "@utils/error-classes";
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

  const formik = useForm<ShoppingListProductState>({
    initialValues: initShoppingListProductValues,
    validationSchema: shoppingListProductValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState: ShoppingListProductSubmitState) => handleSubmit(formState),
  });

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

    if (error instanceof FlanerApiError) {
      formik.setErrors(constructFlanerApiErrorContent(error).formErrors);
    } else {
      dispatch(addToast({ message: "shoppingLists.shoppingListProductEdited" }));
      handleClose();
    }
  };

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  const productCategoriesQuery = useGetProductCategoriesQuery(
    { currentUserUid: authUser?.uid },
    { skip: alertOpen !== AlertOpenState.OPENED }
  );

  const { data: productOptions, isSuccess: productsQueryIsSuccess } = useGetProductsQuery(
    {
      currentUserUid: authUser?.uid,
      categoryId: (formik.values.category?.id || shoppingListProduct?.category.id) as string,
    },
    { skip: alertOpen !== AlertOpenState.OPENED }
  );

  const { data: unitsOptions, isSuccess: unitsQueryIsSuccess } = useGetUnitsQuery(undefined, {
    skip: alertOpen !== AlertOpenState.OPENED,
  });

  useEffect(() => {
    const hasOptionsFetched = productCategoriesQuery.isSuccess && productsQueryIsSuccess && unitsQueryIsSuccess;
    const hasFormInitValuesBeenSet = !!formik.values.category && !!formik.values.unit;

    if (alertOpen === AlertOpenState.OPENED && shoppingListProduct && hasOptionsFetched && !hasFormInitValuesBeenSet) {
      formik.setValues({
        amount: shoppingListProduct.amount,
        description: shoppingListProduct.description,
        category: productCategoriesQuery.data?.find((item) => item.id === shoppingListProduct.category.id) || null,
        product: productOptions?.find((item) => item.id === shoppingListProduct.productDetails.id) || null,
        unit: unitsOptions?.find((item) => item.id === shoppingListProduct.unit.id) || null,
      });
    }
  }, [alertOpen, shoppingListProduct, productCategoriesQuery, productOptions, unitsOptions]);

  const handleCategoryChange = (event: DropdownBlurEvent<DropdownValue<ProductCategory>>) => {
    formik.setFieldTouched("product", false);
    formik.setValues({
      ...formik.values,
      category: event.target.value,
      product: null,
    });
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
                <Dropdown
                  value={values.category}
                  name="category"
                  error={t((errors.category as string) || "")}
                  onBlur={handleCategoryChange}
                  disabled={!productCategoriesQuery.isSuccess}
                  placeholder={t("products.category")}
                  options={productCategoriesOptions}
                  labelKey="name"
                  valueKey="id"
                />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown
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
                    classNamesObj={{ standAloneTextfieldContainerClassName: "flex g-2-rem" }}
                    placeholder={t("common.fields.amount")}
                    error={t(errors.amount || "")}
                    standAloneTextfieldChildren={
                      <Dropdown
                        {...registerBlur<"unit", DropdownChangeEvent<Unit>>("unit")}
                        disabled={!unitsOptions || unitsOptions.length === 0}
                        placeholder={t("common.fields.unit")}
                        options={unitsOptions}
                        labelKey="name"
                        valueKey="id"
                        marginBottomType="none"
                        error={t((errors.unit as string) || "")}
                      />
                    }
                  />
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
