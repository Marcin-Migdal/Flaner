import {
  Alert,
  AlertOpenState,
  Dropdown,
  DropdownChangeEvent,
  Form,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useEffect } from "react";

import { ContentWrapper } from "@components/ContentWrapper";
import { useAppDispatch, useAppSelector } from "@hooks/index";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { Product, UpdateProduct, useEditProductMutation } from "@services/Products";
import { selectAuthorization } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";

import {
  initProductValues,
  ProductState,
  ProductSubmitState,
  productValidationSchema,
} from "../../../../../utils/formik-configs";

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
    onSubmit: (state: ProductSubmitState) => handleSubmit(state),
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
            {({ registerChange, registerBlur }) => (
              <>
                <Textfield placeholder="Name" {...registerChange("name")} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Dropdown<any>
                  placeholder="Category"
                  options={categoryOptions}
                  labelKey={"name"}
                  valueKey={"id"}
                  {...registerBlur<"category", DropdownChangeEvent<ProductCategory>>("category")}
                />
                {/* <ImageField placeholder="Image" {...(registerBlur("image"))} /> */}
              </>
            )}
          </Form>
        )}
      </ContentWrapper>
    </Alert>
  );
};
