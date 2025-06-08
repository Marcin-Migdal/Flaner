import { Alert, AlertOpenState, Form, Textfield, useForm } from "@marcin-migdal/m-component-library";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@hooks";
import { constructFlanerApiErrorContent } from "@services/helpers";
import { ShoppingList, UpdateShoppingList, useEditShoppingListMutation } from "@services/ShoppingLists";
import { addToast, selectAuthorization } from "@slices";
import { FlanerApiError } from "@utils/error-classes";
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

  const formik = useForm<ShoppingListState>({
    initialValues: initShoppingListValues,
    validationSchema: shoppingListValidationSchema,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onSubmit: (formState) => handleSubmit(formState),
  });

  const handleSubmit = async (formState: ShoppingListState) => {
    if (!authUser || !shoppingList) {
      return;
    }

    const payload: UpdateShoppingList = {
      name: formState.name,
      currentUserId: authUser.uid,
    };

    const { error } = await editShoppingList({ shoppingListId: shoppingList.id, payload: payload });

    if (error instanceof FlanerApiError) {
      formik.setErrors(constructFlanerApiErrorContent(error).formErrors);
    } else {
      dispatch(addToast({ message: "shoppingLists.shoppingListEdited" }));
      handleClose();
    }
  };

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
