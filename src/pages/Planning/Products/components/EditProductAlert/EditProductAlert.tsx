import { Alert, AlertOpenState, Dropdown, Form, Textfield, useForm } from "@marcin-migdal/m-component-library";
import { DropdownStringOption } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";
import { useEffect } from "react";

import { useAppSelector } from "@hooks/index";
import { useGetProductCategoriesQuery } from "@services/ProductCategories";
import { useEditProductMutation } from "@services/Products/product-api";
import { Product, UpdateProduct } from "@services/Products/product-types";
import { selectAuthorization } from "@slices/authorization-slice";
import { ProductState, productValidationSchema } from "../../../../../utils/formik-configs";
import { mapCategoryToDropdownOption } from "../../utils/mapCategoryToDropdownOption";

type EditProductAlertProps = {
  alertOpen: AlertOpenState;
  data: Product | undefined;
  handleClose: () => void;
};

export const EditProductAlert = ({ data: product, handleClose, alertOpen }: EditProductAlertProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const productCategoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });
  const [editProduct] = useEditProductMutation();

  const categoryOptions: DropdownStringOption[] = productCategoriesQuery.data?.map(mapCategoryToDropdownOption) || [];

  const handleSubmit = (formState: ProductState) => {
    if (!authUser || !product) {
      return;
    }

    const payload: UpdateProduct = {
      name: formState.name,
    };

    if (formState.category?.value !== product.categoryId) {
      payload.categoryId = formState.category?.value;
    }

    editProduct({ productId: product.id, payload: payload }).then(() => {
      handleClose();
    });
  };

  const formik = useForm<ProductState>({
    initialValues: {
      name: product?.name || "",
      category: categoryOptions.find((category) => category.value === product?.categoryId),
    },
    validationSchema: productValidationSchema,
    onSubmit: (formState) => handleSubmit(formState),
  });

  useEffect(() => {
    alertOpen === AlertOpenState.OPENED &&
      formik.setValues({
        name: product?.name || "",
        category: categoryOptions.find((category) => category.value === product?.categoryId),
      });
  }, [alertOpen]);

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
      <Form formik={formik}>
        {({ register, handleChange }) => (
          <>
            <Textfield placeholder="Name" {...register("name")} />
            <Dropdown
              placeholder="Category"
              options={categoryOptions}
              {...register("category")}
              // {...register<"category", DropdownChangeEvent<DropdownStringOption>>("category")}
              onChange={(e) => handleChange(e)}
            />
            {/* <ImageField placeholder="Image" {...(register("image"))} /> */}
          </>
        )}
      </Form>
    </Alert>
  );
};
