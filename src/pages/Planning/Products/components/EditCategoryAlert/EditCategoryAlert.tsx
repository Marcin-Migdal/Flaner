import {
  Alert,
  AlertOpenState,
  ColorPicker,
  Form,
  IconField,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
1;

import { useAppDispatch, useAppSelector } from "@hooks";
import { ProductCategory, UpdateProductCategory, useEditProductCategoryMutation } from "@services/ProductCategories";
import { addToast, selectAuthorization } from "@slices";
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

  const handleSubmit = (formState: CategorySubmitState) => {
    if (!authUser) {
      return;
    }

    const payload: UpdateProductCategory = {
      name: formState.name,
      icon: formState.icon,
      color: formState.color as string,
    };

    editProductCategory({ categoryId: category.id, payload: payload }).then(() => {
      dispatch(addToast({ message: "products.categoryEdited" }));
      handleClose();
    });
  };

  const formik = useForm<CategoryState>({
    initialValues: { name: category.name, color: category.color, icon: category.icon },
    validationSchema: categoryValidationSchema,
    onSubmit: (formState: CategorySubmitState) => handleSubmit(formState),
  });

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
              returnedColorType="hex"
              error={t((errors.color as string) || "")}
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
