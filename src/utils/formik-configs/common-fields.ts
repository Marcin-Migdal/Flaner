import * as Yup from "yup";

export const schemaAmount = Yup.number().nullable().min(1).max(999).required("validation.required");

export const schemaEmail = Yup.string().email("auth.errors.invalidEmail").required("validation.required");

export const schemaName = Yup.string()
  .min(3, "validation.name.minLength")
  .max(30, "validation.name.maxLength")
  .required("validation.required");

export const schemaOptionalDescription = Yup.string().max(2000, "validation.description.maxLength").default("");

export const schemaDescription = Yup.string()
  .min(3, "validation.description.minLength")
  .max(500, "validation.description.maxLength")
  .required("validation.required");

export const requiredDropdownField = Yup.object()
  .shape({
    label: Yup.string().required("validation.required"),
    value: Yup.string().required("validation.required"),
  })
  .nullable()
  .required("validation.required");

export const schemaAuditFields = {
  createdAt: Yup.string().required("validation.audit.createdAt"),
  updatedAt: Yup.string().required("validation.audit.updatedAt"),
};

export const schemaAccessFields = {
  ownerId: Yup.string().nullable().required("validation.required"),

  editAccess: Yup.array()
    .of(Yup.string().required("validation.array.itemRequired"))
    .min(1, "validation.array.minLength")
    .required("validation.access.editRequired"),

  viewAccess: Yup.array()
    .of(Yup.string().required("validation.array.itemRequired"))
    .min(1, "validation.array.minLength")
    .required("validation.access.viewRequired"),
};
