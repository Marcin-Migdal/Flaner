import {
  Alert,
  Button,
  ButtonAlignContent,
  ButtonWidth,
  Checkbox,
  CheckboxChangeEvent,
  Dropdown,
  DropdownChangeEvent,
  Form,
  Textfield,
  useAlert,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components";
import { useAppDispatch, useAppSelector } from "@hooks";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { CreateProduct, useAddProductMutation } from "@services/Products";
import { addToast, selectAuthorization } from "@slices";

import { initProductValues, ProductState, ProductSubmitState, productValidationSchema } from "@utils/formik-configs";

type AddProductAlertProps = { category: ProductCategory };

export const AddProductAlert = ({ category }: AddProductAlertProps) => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);
  const dispatch = useAppDispatch();

  const [addAnother, setAddAnother] = useState<boolean>(true);

  const categoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });
  const [addProduct] = useAddProductMutation();

  const formik = useForm<ProductState>({
    initialValues: { ...initProductValues, category },
    validationSchema: productValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState: ProductSubmitState) => handleSubmit(formState),
  });

  const [handleOpenAlert, { alertOpen, handleClose }] = useAlert({
    onClose: () => {
      formik.resetForm();
      setAddAnother(true);
    },
  });

  const handleSubmit = (formState: ProductSubmitState) => {
    if (!authUser) {
      return;
    }

    const authUserId = authUser.uid;

    const payload: CreateProduct = {
      name: formState.name,

      // image: formState.image,
      categoryId: formState.category.id,

      ownerId: authUserId,
      editAccess: [authUserId],
      viewAccess: [authUserId],
    };

    addProduct(payload).then(() => {
      dispatch(addToast({ message: "products.productAdded" }));

      if (!addAnother) {
        handleClose();
      } else {
        formik.resetForm();
      }
    });
  };

  const handleCheckboxChange = (event: CheckboxChangeEvent) => {
    setAddAnother(event.target.value);
  };

  return (
    <>
      <Button
        className="add-product-btn"
        text={t("products.addProduct")}
        variant="text"
        icon="plus"
        iconPosition="left"
        width={ButtonWidth.STRETCH}
        alignContent={ButtonAlignContent.START}
        onClick={() => handleOpenAlert()}
      />
      <Alert
        header={t("products.addProduct")}
        className="add-product-alert"
        alertOpen={alertOpen}
        handleClose={handleClose}
        confirmBtnText={t("common.actions.add")}
        onConfirm={formik.submitForm}
        declineBtnText={t("common.actions.close")}
        onDecline={handleClose}
      >
        <ContentWrapper query={categoriesQuery}>
          {({ data: categoryOptions }) => (
            <Form formik={formik} disableSubmitOnEnter>
              {({ errors, registerChange, registerBlur }) => (
                <>
                  <Textfield
                    {...registerChange("name")}
                    autoFocus
                    placeholder={t("common.fields.name")}
                    error={t(errors.name || "")}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Dropdown<any>
                    {...registerBlur<"category", DropdownChangeEvent<ProductCategory>>("category")}
                    placeholder={t("products.category")}
                    options={categoryOptions}
                    labelKey={"name"}
                    valueKey={"id"}
                    error={t((errors.category as string) || "")}
                  />
                  {/* <ImageField
                    {...registerBlur("image")}
                    placeholder="common.fields.image"
                    error={t((errors.image as string) || "")}
                  /> */}
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
