import { Timestamp } from "firebase/firestore";

export const stringDateToTimeStamp = (stringDate: string): Timestamp => {
  return Timestamp.fromDate(new Date(stringDate));
};
