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

import { ProductCategory, useGetProductCategoriesQuery } from "../../../../../app/services/ProductCategories";
import { CreateProduct, useAddProductMutation } from "../../../../../app/services/Products";
import { addToast, selectAuthorization } from "../../../../../app/slices";
import { ContentWrapper } from "../../../../../components";
import { useAppDispatch, useAppSelector } from "../../../../../hooks";

import {
  initProductValues,
  ProductState,
  ProductSubmitState,
  productValidationSchema,
} from "../../../../../utils/formik-configs";

type AddProductAlertProps = { category: ProductCategory };

export const AddProductAlert = ({ category }: AddProductAlertProps) => {
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
      dispatch(addToast({ message: `Product has been added` }));

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
        <ContentWrapper query={categoriesQuery}>
          {({ data: categoryOptions }) => (
            <Form formik={formik} disableSubmitOnEnter>
              {({ registerChange, registerBlur }) => (
                <>
                  <Textfield autoFocus placeholder="Name" {...registerChange("name")} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Dropdown<any>
                    placeholder="Category"
                    options={categoryOptions}
                    labelKey={"name"}
                    valueKey={"id"}
                    {...registerBlur<"category", DropdownChangeEvent<ProductCategory>>("category")}
                  />
                  {/* <ImageField placeholder="Image" {...(registerBlur("image)} /> */}
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
