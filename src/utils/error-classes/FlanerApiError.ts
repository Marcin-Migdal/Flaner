import { FlanerApiErrorsContentKeys } from "@utils/constants";

export type FlanerApiErrorData = {
  code: FlanerApiErrorsContentKeys;
  entity?: string;
};

export class FlanerApiError {
  code: FlanerApiErrorsContentKeys;
  entity?: string;

  constructor(code: FlanerApiErrorsContentKeys, entity?: string) {
    this.code = code;
    this.entity = entity;
  }

  getErrorData(): FlanerApiErrorData {
    return {
      code: this.code,
      entity: this.entity,
    };
  }
}
