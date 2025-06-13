import { FlanerApiErrorsContentKeys } from "@utils/constants";

export class FlanerApiError {
  code: FlanerApiErrorsContentKeys;
  entity?: string;

  constructor(code: FlanerApiErrorsContentKeys, entity?: string) {
    this.code = code;
    this.entity = entity;
  }
}
