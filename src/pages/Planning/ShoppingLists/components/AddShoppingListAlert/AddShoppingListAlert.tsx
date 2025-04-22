import { Alert, Button, Form, Textfield, useAlert, useForm } from "@marcin-migdal/m-component-library";

import { useAppDispatch, useAppSelector } from "@hooks/index";
import { CreateShoppingList, useAddShoppingListMutation } from "@services/ShoppingLists";
import { selectAuthorization } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";
import {
  initShoppingListValues,
  ShoppingListState,
  ShoppingListSubmitState,
  shoppingListValidationSchema,
} from "@utils/formik-configs";

export const AddShoppingListAlert = () => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const [addShoppingList] = useAddShoppingListMutation();

  const formik = useForm<ShoppingListState>({
    initialValues: initShoppingListValues,
    validationSchema: shoppingListValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState) => handleSubmit(formState),
  });

  const [handleOpenAlert, alertProps] = useAlert({
    onClose: () => formik.resetForm(),
  });

  const handleSubmit = (formState: ShoppingListSubmitState) => {
    if (!authUser) {
      return;
    }

    const authUserId = authUser.uid;

    const payload: CreateShoppingList = {
      name: formState.name,
      ownerId: authUserId,
      editAccess: [authUserId],
      viewAccess: [authUserId],
    };

    addShoppingList(payload).then(() => {
      formik.resetForm();
      alertProps.handleClose();

      dispatch(addToast({ message: `Shopping list has been added` }));
    });
  };

  return (
    <>
      <Button onClick={() => handleOpenAlert()} icon="plus" variant="full" disableDefaultMargin />
      <Alert
        header="Add shopping list"
        className="add-shopping-list-alert"
        confirmBtnText="Add"
        onConfirm={formik.submitForm}
        declineBtnText="Close"
        onDecline={alertProps.handleClose}
        {...alertProps}
      >
        <Form formik={formik} disableSubmitOnEnter>
          {({ registerChange }) => <Textfield autoFocus placeholder="Name" {...registerChange("name")} />}
        </Form>
      </Alert>
    </>
  );
};
