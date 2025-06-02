import { Alert, Button, Form, Textfield, useAlert, useForm } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@hooks";
import { CreateShoppingList, useAddShoppingListMutation } from "@services/ShoppingLists";
import { addToast, selectAuthorization } from "@slices";

import {
  ShoppingListState,
  ShoppingListSubmitState,
  initShoppingListValues,
  shoppingListValidationSchema,
} from "@utils/formik-configs";

export const AddShoppingListAlert = () => {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

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

      dispatch(addToast({ message: "shoppingLists.shoppingListAdded" }));
    });
  };

  return (
    <>
      <Button onClick={() => handleOpenAlert()} icon="plus" variant="full" disableDefaultMargin />
      <Alert
        header={t("shoppingLists.addShoppingList")}
        className="add-shopping-list-alert"
        confirmBtnText={t("common.actions.add")}
        onConfirm={formik.submitForm}
        declineBtnText={t("common.actions.close")}
        onDecline={alertProps.handleClose}
        {...alertProps}
      >
        <Form formik={formik} disableSubmitOnEnter>
          {({ errors, registerChange }) => (
            <Textfield
              {...registerChange("name")}
              autoFocus
              placeholder={t("common.fields.name")}
              error={t(errors.name || "")}
            />
          )}
        </Form>
      </Alert>
    </>
  );
};
