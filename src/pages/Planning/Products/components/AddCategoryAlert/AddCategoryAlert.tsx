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
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@hooks";
import { constructFlanerApiErrorContent } from "@services/helpers";
import { CreateProductCategory, useAddProductCategoryMutation } from "@services/ProductCategories";
import { addToast, selectAuthorization } from "@slices";
import { FlanerApiErrorData } from "@utils/error-classes";
import { CategorySubmitState, categoryValidationSchema, initCategoryValues } from "@utils/formik-configs";

export const AddCategoryAlert = () => {
  const { t } = useTranslation();
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
      dispatch(addToast({ message: "products.categoryAdded" }));

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
        header={t("products.addCategory")}
        className="add-category-alert"
        alertOpen={alertOpen}
        handleClose={handleClose}
        confirmBtnText={t("common.actions.add")}
        onConfirm={formik.submitForm}
        declineBtnText={t("common.actions.close")}
        onDecline={handleClose}
      >
        <Form formik={formik} disableSubmitOnEnter>
          {({ values, errors, registerBlur, registerChange, handleClear }) => (
            <>
              <Textfield
                {...registerChange("name")}
                autoFocus
                placeholder={t("common.fields.name")}
                error={t(errors.name || "")}
              />
              <IconField
                {...registerBlur("icon")}
                placeholder={t("common.fields.icon")}
                iconColor={values.color}
                onClear={handleClear}
                error={t(errors.icon || "")}
              />
              <ColorPicker
                {...registerBlur("color")}
                placeholder={t("common.fields.color")}
                returnedColorType="hex"
                error={t((errors.color as string) || "")}
              />
            </>
          )}
        </Form>
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
