import { Alert, AlertOpenState, Form, Textfield, useForm } from "@marcin-migdal/m-component-library";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@hooks";
import { ShoppingList, UpdateShoppingList, useEditShoppingListMutation } from "@services/ShoppingLists";
import { addToast, selectAuthorization } from "@slices";
import { initShoppingListValues, ShoppingListState, shoppingListValidationSchema } from "@utils/formik-configs";

type EditShoppingListAlertProps = {
  alertOpen: AlertOpenState;
  data: ShoppingList | undefined;
  handleClose: () => void;
};

export const EditShoppingListAlert = ({ data: shoppingList, handleClose, alertOpen }: EditShoppingListAlertProps) => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

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
      dispatch(addToast({ message: "shoppingLists.shoppingListEdited", type: "success" }));
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
      header={t("shoppingLists.editShoppingList")}
      alertOpen={alertOpen}
      handleClose={handleCloseAlert}
      confirmBtnText={t("common.actions.edit")}
      onConfirm={formik.submitForm}
      declineBtnText={t("common.actions.close")}
      onDecline={handleCloseAlert}
    >
      <Form formik={formik} disableSubmitOnEnter>
        {({ errors, registerChange }) => (
          <Textfield {...registerChange("name")} placeholder={t("common.fields.name")} error={t(errors.name || "")} />
        )}
      </Form>
    </Alert>
  );
};
