import { Alert, Button, ColorPicker, Form, IconField, Textfield, useAlert } from "@marcin-migdal/m-component-library";

import { useState } from "react";
import { CategoryState, categoryValidationSchema, categoryValues } from "./category-formik-config";

export const AddCategoryAlert = () => {
  const [categoryForm, setCategoryForm] = useState<CategoryState>(categoryValues);

  const [handleOpenAlert, { alertOpen, handleClose }] = useAlert();

  const handleAddCategory = () => {
    console.log(categoryForm);
  };

  return (
    <>
      <Button onClick={() => handleOpenAlert()} icon="plus" variant="full" className="ml-2-rem" />
      <Alert
        header="Add category"
        className="add-category-alert"
        alertOpen={alertOpen}
        handleClose={handleClose}
        confirmBtnText="Add"
        onConfirm={handleAddCategory}
        declineBtnText="Close"
        onDecline={handleClose}
      >
        <Form<CategoryState>
          initialValues={categoryValues}
          onSubmit={() => {}}
          handleValuesChange={(event) => {
            const { value, name } = event.target;

            setCategoryForm({ ...categoryForm, [name]: value });

            return value as any;
          }}
          validationSchema={categoryValidationSchema}
        >
          {({ values, errors, handleChange }) => (
            <>
              <Textfield
                placeholder="Name"
                name="name"
                value={values.name}
                error={errors.name}
                onChange={handleChange}
              />
              <ColorPicker
                placeholder="Color"
                name="color"
                returnedColorType="hex"
                error={errors.color}
                defaultValue={"red"}
                onChange={handleChange}
              />
              <IconField
                placeholder="Icon"
                name="icon"
                value={values.icon}
                error={errors.icon}
                onChange={(event) => {
                  handleChange(event);
                }}
                iconColor={values.color}
              />
            </>
          )}
        </Form>
      </Alert>
    </>
  );
};
