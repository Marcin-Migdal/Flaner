import {
  Alert,
  AlertOpenState,
  Dropdown,
  Form,
  SimpleChangeEvent,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components";
import { useAppDispatch, useAppSelector } from "@hooks";
import { useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, UpdateProduct, useEditProductMutation } from "@services/Products";
import { addToast, selectAuthorization } from "@slices";
import { initProductValues, ProductState, ProductSubmitState, productValidationSchema } from "@utils/formik-configs";

type EditProductAlertProps = {
  alertOpen: AlertOpenState;
  data: Product | undefined;
  handleClose: () => void;
};

export const EditProductAlert = ({ data: product, handleClose, alertOpen }: EditProductAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const categoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });
  const [editProduct] = useEditProductMutation();

  const handleSubmit = (formState: ProductSubmitState) => {
    if (!authUser || !product) {
      return;
    }

    const payload: UpdateProduct = {
      name: formState.name,
    };

    if (formState.category.id !== product.categoryId) {
      payload.categoryId = formState.category.id;
    }

    editProduct({ productId: product.id, payload: payload }).then(() => {
      handleClose();
      dispatch(addToast({ message: "products.productEdited" }));
    });
  };

  const formik = useForm<ProductState>({
    initialValues: initProductValues,
    validationSchema: productValidationSchema,
    onSubmit: (formState: ProductSubmitState) => handleSubmit(formState),
  });

  useEffect(() => {
    if (alertOpen === AlertOpenState.OPENED && product && categoriesQuery.data) {
      formik.setValues({
        name: product.name,
        category: categoriesQuery.data.find((category) => category.id === product.categoryId) || null,
      });
    }
  }, [alertOpen, categoriesQuery, product]);

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <Alert
      header={t("products.editProduct")}
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText={t("common.actions.edit")}
      onConfirm={formik.submitForm}
      declineBtnText={t("common.actions.close")}
      onDecline={handleCloseAlert}
    >
      <ContentWrapper query={categoriesQuery}>
        {({ data: categoryOptions }) => (
          <Form formik={formik} disableSubmitOnEnter>
            {({ errors, registerChange, registerBlur }) => {
              return (
                <>
                  <Textfield
                    {...registerChange<"name", SimpleChangeEvent<ProductState>>("name")}
                    placeholder={t("common.fields.name")}
                    error={t(errors.name || "")}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Dropdown<any>
                    {...registerBlur<"category", SimpleChangeEvent<ProductState>>("category")}
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
              );
            }}
          </Form>
        )}
      </ContentWrapper>
    </Alert>
  );
};
