import { Timestamp } from "firebase/firestore";
import * as Yup from "yup";

export const schemaAmount = Yup.number().nullable().min(1).max(999).required("Amount is required");

export const schemaEmail = Yup.string().email("Invalid email address").required("Email is required");

export const schemaName = Yup.string()
  .required("Name is required")
  .min(3, "Name is too short")
  .max(20, "Name is too long");

export const schemaOptionalDescription = Yup.string().max(2000, "Description is too long").default("");

export const schemaDescription = Yup.string()
  .required("Description is required")
  .min(3, "Description is too short")
  .max(2000, "Description is too long");

export const requiredDropdownField = Yup.object()
  .shape({
    label: Yup.string().required("Required"),
    value: Yup.string().required("Required"),
  })
  .nullable()
  .required("Required");

const isFirebaseTimestamp = (value: unknown): value is Timestamp => {
  return value instanceof Timestamp;
};

export const schemaAuditFields = {
  createdAt: Yup.mixed<Timestamp>()
    .test("is-timestamp", "createdAt must be a valid Firebase Timestamp", isFirebaseTimestamp)
    .required("The createdAt field is required"),

  updatedAt: Yup.mixed<Timestamp>()
    .test("is-timestamp", "updatedAt must be a valid Firebase Timestamp", isFirebaseTimestamp)
    .required("The updatedAt field is required"),
};

export const schemaAccessFields = {
  ownerId: Yup.string().nullable().required("Required"),

  editAccess: Yup.array()
    .of(Yup.string().required("Each item must be a string"))
    .min(1, "At least one item is required")
    .required("The editAccess field is required"),

  viewAccess: Yup.array()
    .of(Yup.string().required("Each item must be a string"))
    .min(1, "At least one item is required")
    .required("The viewAccess field is required"),
};
