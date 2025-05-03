import { Timestamp } from "firebase/firestore";

export const getCurrentStringDate = (): string => {
  return Timestamp.now().toDate().toUTCString();
};
