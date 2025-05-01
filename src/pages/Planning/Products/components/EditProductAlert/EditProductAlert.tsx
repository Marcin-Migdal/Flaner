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
      dispatch(addToast({ message: `Product has been edited` }));
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
      header="Edit product"
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText="Edit"
      onConfirm={formik.submitForm}
      declineBtnText="Close"
      onDecline={handleCloseAlert}
    >
      <ContentWrapper query={categoriesQuery}>
        {({ data: categoryOptions }) => (
          <Form formik={formik} disableSubmitOnEnter>
            {({ registerChange, registerBlur }) => {
              return (
                <>
                  <Textfield placeholder="Name" {...registerChange<"name", SimpleChangeEvent<ProductState>>("name")} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Dropdown<any>
                    placeholder="Category"
                    options={categoryOptions}
                    labelKey={"name"}
                    valueKey={"id"}
                    {...registerBlur<"category", SimpleChangeEvent<ProductState>>("category")}
                  />
                  {/* <ImageField placeholder="Image" {...(registerBlur("image"))} /> */}
                </>
              );
            }}
          </Form>
        )}
      </ContentWrapper>
    </Alert>
  );
};
