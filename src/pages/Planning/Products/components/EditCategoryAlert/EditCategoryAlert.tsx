import {
  Alert,
  AlertOpenState,
  ColorPicker,
  Form,
  IconField,
  Textfield,
  useForm,
} from "@marcin-migdal/m-component-library";

import { addToast, selectAuthorization } from "../../../../../app/slices";
import { useAppDispatch, useAppSelector } from "../../../../../hooks";
import { CategoryState, CategorySubmitState, categoryValidationSchema } from "../../../../../utils/formik-configs";

import {
  ProductCategory,
  UpdateProductCategory,
  useEditProductCategoryMutation,
} from "../../../../../app/services/ProductCategories";

type EditCategoryAlertProps = {
  category: ProductCategory;
  alertOpen: AlertOpenState;
  handleClose: () => void;
};

export const EditCategoryAlert = ({ category, handleClose, alertOpen }: EditCategoryAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

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
      dispatch(addToast({ message: `Category has been edited` }));
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
      header="Edit category"
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText="Edit"
      onConfirm={formik.submitForm}
      declineBtnText="Close"
      onDecline={handleCloseAlert}
    >
      <Form formik={formik} disableSubmitOnEnter>
        {({ values, registerChange, registerBlur, handleClear }) => (
          <>
            <Textfield placeholder="Name" {...registerChange("name")} />
            <ColorPicker placeholder="Color" returnedColorType="hex" {...registerBlur("color")} />
            <IconField placeholder="Icon" iconColor={values.color} onClear={handleClear} {...registerBlur("icon")} />
          </>
        )}
      </Form>
    </Alert>
  );
};
