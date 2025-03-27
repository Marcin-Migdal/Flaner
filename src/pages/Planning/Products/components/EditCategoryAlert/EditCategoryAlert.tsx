import {
  Alert,
  AlertOpenState,
  ColorPicker,
  Form,
  IconField,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";

import { useAppSelector } from "@hooks/index";
import { ProductCategory, UpdateProductCategory, useEditProductCategoryMutation } from "@services/ProductCategories";
import { selectAuthorization } from "@slices/authorization-slice";
import { CategoryState, categoryValidationSchema } from "../../../../../utils/formik-configs";

type EditCategoryAlertProps = {
  category: ProductCategory;
  alertOpen: AlertOpenState;
  handleClose: () => void;
};

export const EditCategoryAlert = ({ category, handleClose, alertOpen }: EditCategoryAlertProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [editProductCategory] = useEditProductCategoryMutation();

  const handleSubmit = (formState: CategoryState) => {
    if (!authUser) {
      return;
    }

    const payload: UpdateProductCategory = {
      name: formState.name,
      icon: formState.icon,
      color: formState.color as string,
    };

    editProductCategory({ categoryId: category.id, payload: payload }).then(() => {
      handleClose();
    });
  };

  const formik = useForm<CategoryState>({
    initialValues: { name: category.name, color: category.color, icon: category.icon },
    validationSchema: categoryValidationSchema,
    onSubmit: handleSubmit,
  });

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <Alert
      header="Edit category"
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText="Edit"
      onConfirm={formik.submitForm}
      declineBtnText="Close"
      onDecline={handleCloseAlert}
    >
      <Form formik={formik}>
        {({ register, values, handleChange }) => (
          <>
            <Textfield placeholder="Name" {...register("name")} />
            <ColorPicker placeholder="Color" returnedColorType="hex" {...register("color")} />
            <IconField placeholder="Icon" iconColor={values.color} onClear={handleChange} {...register("icon")} />
          </>
        )}
      </Form>
    </Alert>
  );
};
