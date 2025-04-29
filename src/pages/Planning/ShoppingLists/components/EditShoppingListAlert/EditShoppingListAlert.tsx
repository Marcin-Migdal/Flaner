import { Alert, AlertOpenState, Form, Textfield, useForm } from "@marcin-migdal/m-component-library";
import { useEffect } from "react";

import { addToast, selectAuthorization } from "../../../../../app/slices";
import { useAppDispatch, useAppSelector } from "../../../../../hooks";

import {
  initShoppingListValues,
  ShoppingListState,
  shoppingListValidationSchema,
} from "../../../../../utils/formik-configs";

import {
  ShoppingList,
  UpdateShoppingList,
  useEditShoppingListMutation,
} from "../../../../../app/services/ShoppingLists";

type EditShoppingListAlertProps = {
  alertOpen: AlertOpenState;
  data: ShoppingList | undefined;
  handleClose: () => void;
};

export const EditShoppingListAlert = ({ data: shoppingList, handleClose, alertOpen }: EditShoppingListAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const [editShoppingList] = useEditShoppingListMutation();

  const handleSubmit = (formState: ShoppingListState) => {
    if (!authUser || !shoppingList) {
      return;
    }

    const payload: UpdateShoppingList = {
      name: formState.name,
    };

    editShoppingList({ shoppingListId: shoppingList.id, payload: payload }).then(() => {
      handleClose();
      dispatch(addToast({ message: `Shopping list has been edited` }));
    });
  };

  const formik = useForm<ShoppingListState>({
    initialValues: initShoppingListValues,
    validationSchema: shoppingListValidationSchema,
    onSubmit: (formState) => handleSubmit(formState),
  });

  useEffect(() => {
    if (alertOpen === AlertOpenState.OPENED && shoppingList) {
      formik.setValues({ name: shoppingList?.name || "" });
    }
  }, [alertOpen]);

  const handleCloseAlert = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <Alert
      header="Edit shopping list"
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText="Edit"
      onConfirm={formik.submitForm}
      declineBtnText="Close"
      onDecline={handleCloseAlert}
    >
      <Form formik={formik} disableSubmitOnEnter>
        {({ registerChange }) => <Textfield placeholder="Name" {...registerChange("name")} />}
      </Form>
    </Alert>
  );
};
