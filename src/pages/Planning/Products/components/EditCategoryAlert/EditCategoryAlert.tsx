import {
  Alert,
  AlertOpenState,
  ColorPicker,
  Form,
  IconField,
  ReturnedColor,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
1;

import { useAppDispatch, useAppSelector } from "@hooks";
import { constructFlanerApiErrorContent } from "@services/helpers";
import { ProductCategory, UpdateProductCategory, useEditProductCategoryMutation } from "@services/ProductCategories";
import { addToast, selectAuthorization } from "@slices";
import { FlanerApiError } from "@utils/error-classes";
import { CategoryState, CategorySubmitState, categoryValidationSchema } from "@utils/formik-configs";

type EditCategoryAlertProps = {
  category: ProductCategory;
  alertOpen: AlertOpenState;
  handleClose: () => void;
};

export const EditCategoryAlert = ({ category, handleClose, alertOpen }: EditCategoryAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const [editProductCategory] = useEditProductCategoryMutation();

  const formik = useForm<CategoryState>({
    initialValues: { name: category.name, color: category.color, icon: category.icon },
    validationSchema: categoryValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState: CategorySubmitState) => handleSubmit(formState),
  });

  const handleSubmit = async (formState: CategorySubmitState) => {
    if (!authUser) {
      return;
    }

    const payload: UpdateProductCategory = {
      name: formState.name,
      currentUserId: authUser.uid,
      icon: formState.icon,
      color: formState.color,
    };

    const { error } = await editProductCategory({ categoryId: category.id, payload: payload });

    if (error instanceof FlanerApiError) {
      formik.setErrors(constructFlanerApiErrorContent(error).formErrors);
    } else {
      dispatch(addToast({ message: "products.categoryEdited" }));
      handleClose();
    }
  };

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <Alert
      header={t("products.editCategory")}
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText={t("common.actions.edit")}
      onConfirm={formik.submitForm}
      declineBtnText={t("common.actions.close")}
      onDecline={handleCloseAlert}
    >
      <Form formik={formik} disableSubmitOnEnter>
        {({ errors, values, registerChange, registerBlur, handleClear }) => (
          <>
            <Textfield {...registerChange("name")} placeholder={t("common.fields.name")} error={t(errors.name || "")} />
            <ColorPicker
              {...registerBlur("color")}
              placeholder={t("common.fields.color")}
              returnedColorType={ReturnedColor.HEX}
              error={t(errors.color || "")}
            />
            <IconField
              {...registerBlur("icon")}
              placeholder={t("common.fields.icon")}
              iconColor={values.color}
              onClear={handleClear}
              error={t(errors.icon || "")}
            />
          </>
        )}
      </Form>
    </Alert>
  );
};
