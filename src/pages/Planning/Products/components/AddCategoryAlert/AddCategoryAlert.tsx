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

import { useAppSelector } from "@hooks/index";
import { CreateProductCategory, useAddProductCategoryMutation } from "@services/ProductCategories";
import { selectAuthorization } from "@slices/authorization-slice";
import { CategoryState, categoryValidationSchema, initCategoryValues } from "../../../../../utils/formik-configs";

export const AddCategoryAlert = () => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [addAnother, setAddAnother] = useState<boolean>(true);

  const [addProductCategory] = useAddProductCategoryMutation();

  const formik = useForm({
    initialValues: initCategoryValues,
    validationSchema: categoryValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState) => handleSubmit(formState),
  });

  const [handleOpenAlert, { alertOpen, handleClose }] = useAlert({
    onClose: () => {
      formik.resetForm();
      setAddAnother(true);
    },
  });

  const handleSubmit = (formState: CategoryState) => {
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

    addProductCategory(payload).then(() => {
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
        <Form formik={formik}>
          {({ register, values, handleChange }) => (
            <>
              <Textfield autoFocus placeholder="Name" {...register("name")} />
              <IconField placeholder="Icon" iconColor={values.color} onClear={handleChange} {...register("icon")} />
              <ColorPicker placeholder="Color" returnedColorType="hex" {...register("color")} />
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
