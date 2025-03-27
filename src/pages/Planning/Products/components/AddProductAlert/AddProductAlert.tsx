import {
  Alert,
  Button,
  ButtonAlignContent,
  ButtonWidth,
  Checkbox,
  CheckboxChangeEvent,
  Dropdown,
  Form,
  Textfield,
  useAlert,
  useForm,
} from "@marcin-migdal/m-component-library";
import { DropdownStringOption } from "@marcin-migdal/m-component-library/build/components/Inputs/Dropdown/types";
import { useState } from "react";

import { useAppSelector } from "@hooks/index";
import { ProductCategory, useGetProductCategoriesQuery } from "@services/ProductCategories";
import { useAddProductMutation } from "@services/Products/product-api";
import { CreateProduct } from "@services/Products/product-types";
import { selectAuthorization } from "@slices/authorization-slice";
import { initProductValues, ProductState, productValidationSchema } from "../../../../../utils/formik-configs";
import { mapCategoryToDropdownOption } from "../../utils/mapCategoryToDropdownOption";

type AddProductAlertProps = { category: ProductCategory };

export const AddProductAlert = ({ category }: AddProductAlertProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [addAnother, setAddAnother] = useState<boolean>(true);

  const productCategoriesQuery = useGetProductCategoriesQuery({ currentUserUid: authUser?.uid });
  const [addProduct] = useAddProductMutation();

  const categoryOptions: DropdownStringOption[] = productCategoriesQuery.data?.map(mapCategoryToDropdownOption) || [];

  const formik = useForm<ProductState>({
    initialValues: { ...initProductValues, category: mapCategoryToDropdownOption(category) },
    validationSchema: productValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState) => handleSubmit(formState),
  });

  const [handleOpenAlert, { alertOpen, handleClose }] = useAlert({
    onClose: () => {
      formik.resetForm();
      setAddAnother(true);
    },
  });

  const handleSubmit = (formState: ProductState) => {
    if (!authUser) {
      return;
    }

    const authUserId = authUser.uid;

    const payload: CreateProduct = {
      name: formState.name,

      // image: formState.image,
      categoryId: formState.category?.value as string,

      ownerId: authUserId,
      editAccess: [authUserId],
      viewAccess: [authUserId],
    };

    addProduct(payload).then(() => {
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
        text="Add Product"
        variant="text"
        icon="plus"
        iconPosition="left"
        width={ButtonWidth.STRETCH}
        alignContent={ButtonAlignContent.START}
        onClick={() => handleOpenAlert()}
      />
      <Alert
        header="Add product"
        className="add-product-alert"
        alertOpen={alertOpen}
        handleClose={handleClose}
        confirmBtnText="Add"
        onConfirm={formik.submitForm}
        declineBtnText="Close"
        onDecline={handleClose}
      >
        <Form formik={formik}>
          {({ register, handleChange }) => (
            <>
              <Textfield autoFocus placeholder="Name" {...register("name")} />
              <Dropdown
                placeholder="Category"
                options={categoryOptions}
                {...register("category")}
                // {...register<"category", DropdownChangeEvent<DropdownStringOption>>("category")}
                onChange={(e) => handleChange(e)}
              />
              {/* <ImageField placeholder="Image" {...(register("image)} /> */}
            </>
          )}
        </Form>
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
