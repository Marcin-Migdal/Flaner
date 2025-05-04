import {
  Alert,
  Button,
  Checkbox,
  CheckboxChangeEvent,
  ColorPicker,
  Form,
  IconField,
  Textfield,
  useAlert,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "@hooks";
import { constructFlanerApiErrorContent } from "@services/helpers";
import { CreateProductCategory, useAddProductCategoryMutation } from "@services/ProductCategories";
import { addToast, selectAuthorization } from "@slices";
import { FlanerApiErrorData } from "@utils/error-classes";
import { CategorySubmitState, categoryValidationSchema, initCategoryValues } from "@utils/formik-configs";

export const AddCategoryAlert = () => {
  const { authUser } = useAppSelector(selectAuthorization);
  const dispatch = useAppDispatch();

  const [addAnother, setAddAnother] = useState<boolean>(true);

  const [addProductCategory] = useAddProductCategoryMutation();

  const formik = useForm({
    initialValues: initCategoryValues,
    validationSchema: categoryValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState: CategorySubmitState) => handleSubmit(formState),
  });

  const [handleOpenAlert, { alertOpen, handleClose }] = useAlert({
    onClose: () => {
      formik.resetForm();
      setAddAnother(true);
    },
  });

  const handleSubmit = async (formState: CategorySubmitState) => {
    if (!authUser) {
      return;
    }

    const authUserId = authUser.uid;

    const payload: CreateProductCategory = {
      name: formState.name,
      icon: formState.icon,
      color: formState.color as string,
      ownerId: authUserId,
      editAccess: [authUserId],
      viewAccess: [authUserId],
    };

    const { error } = await addProductCategory(payload);

    if (!error) {
      dispatch(addToast({ message: `Category has been added` }));

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
      <Button onClick={() => handleOpenAlert()} icon="plus" variant="full" disableDefaultMargin />
      <Alert
        header="Add category"
        className="add-category-alert"
        alertOpen={alertOpen}
        handleClose={handleClose}
        confirmBtnText="Add"
        onConfirm={formik.submitForm}
        declineBtnText="Close"
        onDecline={handleClose}
      >
        <Form formik={formik} disableSubmitOnEnter>
          {({ values, registerBlur, registerChange, handleClear }) => (
            <>
              <Textfield autoFocus placeholder="Name" {...registerChange("name")} />
              <IconField placeholder="Icon" iconColor={values.color} onClear={handleClear} {...registerBlur("icon")} />
              <ColorPicker placeholder="Color" returnedColorType="hex" {...registerBlur("color")} />
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
