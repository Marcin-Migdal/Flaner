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

import { useAppDispatch, useAppSelector } from "@hooks/index";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, useGetProductsQuery } from "@services/Products";
import { CreateShoppingListProduct, useAddShoppingListProductMutation } from "@services/ShoppingListsProduct";
import { Unit, useGetUnitsQuery } from "@services/Units";
import { selectAuthorization } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";

import { ContentWrapper } from "@components/ContentWrapper";
import {
  initShoppingListProductValues,
  ShoppingListProductState,
  ShoppingListProductSubmitState,
  shoppingListProductValidationSchema,
} from "@utils/formik-configs/shopping-list-product-formik-config";

type AddShoppingListProductAlertProps = {
  shoppingListId: string | null;
};

export const AddShoppingListProductAlert = ({ shoppingListId }: AddShoppingListProductAlertProps) => {
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

  const handleSubmit = (formState: ShoppingListProductSubmitState) => {
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

    addShoppingListProduct({ shoppingListId, payload }).then(() => {
      if (!addAnother) {
        handleClose();
      } else {
        formik.resetForm();
      }

      dispatch(addToast({ message: `Shopping list product has been added` }));
    });
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
        header="Add shopping list product"
        className="add-shopping-list-product-alert"
        confirmBtnText="Add"
        onConfirm={formik.submitForm}
        declineBtnText="Close"
        onDecline={handleClose}
        alertOpen={alertOpen}
        handleClose={handleClose}
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
        <Checkbox
          labelType="right"
          labelWidth={90}
          label="Add another"
          checked={addAnother}
          onChange={handleCheckboxChange}
        />
      </Alert>
    </>
  );
};
