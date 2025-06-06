import {
  Alert,
  AlertOpenState,
  Button,
  Checkbox,
  CheckboxChangeEvent,
  Dropdown,
  DropdownChangeEvent,
  Form,
  NumberField,
  Textarea,
  useAlert,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components";
import { useAppDispatch, useAppSelector } from "@hooks";
import { constructFlanerApiErrorContent } from "@services/helpers";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, useGetProductsQuery } from "@services/Products";
import { CreateShoppingListProduct, useAddShoppingListProductMutation } from "@services/ShoppingListsProduct";
import { Unit, useGetUnitsQuery } from "@services/Units";
import { addToast, selectAuthorization } from "@slices";
import { FlanerApiErrorData } from "@utils/error-classes";

import {
  ShoppingListProductState,
  ShoppingListProductSubmitState,
  initShoppingListProductValues,
  shoppingListProductValidationSchema,
} from "@utils/formik-configs";

type AddShoppingListProductAlertProps = {
  shoppingListId: string | null;
};

export const AddShoppingListProductAlert = ({ shoppingListId }: AddShoppingListProductAlertProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const [addAnother, setAddAnother] = useState<boolean>(true);

  const [addShoppingListProduct] = useAddShoppingListProductMutation();

  const formik = useForm<ShoppingListProductState>({
    initialValues: initShoppingListProductValues,
    validationSchema: shoppingListProductValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState: ShoppingListProductSubmitState) => handleSubmit(formState),
  });

  const [handleOpenAlert, { handleClose, alertOpen }] = useAlert({
    onClose: () => {
      formik.resetForm();
      setAddAnother(true);
    },
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

  const handleSubmit = async (formState: ShoppingListProductSubmitState) => {
    const { category, product, unit, amount, description } = formState;

    if (!authUser || !shoppingListId) {
      return;
    }

    const payload: CreateShoppingListProduct = {
      amount: amount,
      description: description,
      completed: false,
      category: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
      productDetails: {
        id: product.id,
        name: product.name,
      },
      unit: unit,
    };

    const { error } = await addShoppingListProduct({ shoppingListId, payload });

    if (!error) {
      dispatch(addToast({ message: "shoppingLists.shoppingListProductAdded" }));

      if (!addAnother) {
        handleClose();
      } else {
        formik.resetForm();
      }
    } else {
      formik.setErrors(constructFlanerApiErrorContent(error as FlanerApiErrorData).formErrors);
    }
  };

  const handleCheckboxChange = (event: CheckboxChangeEvent) => {
    setAddAnother(event.target.value);
  };

  return (
    <>
      <Button
        disabled={!shoppingListId}
        onClick={() => handleOpenAlert()}
        icon="plus"
        variant="full"
        disableDefaultMargin
      />
      <Alert
        header={t("shoppingLists.addProductToShoppingList")}
        className="add-shopping-list-product-alert"
        confirmBtnText={t("common.actions.add")}
        onConfirm={formik.submitForm}
        declineBtnText={t("common.actions.close")}
        onDecline={handleClose}
        alertOpen={alertOpen}
        handleClose={handleClose}
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
                  <Textarea {...registerChange("description")} placeholder={t("common.fields.description")} />
                </>
              )}
            </Form>
          )}
        </ContentWrapper>
        <Checkbox
          labelType="right"
          labelWidth={90}
          label={t("common.fields.addAnother")}
          checked={addAnother}
          onChange={handleCheckboxChange}
        />
      </Alert>
    </>
  );
};
