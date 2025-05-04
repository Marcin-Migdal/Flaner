export type FlanerApiErrorData = {
  code: string;
  entity?: string;
};

export class FlanerApiError {
  code: string;
  entity?: string;

  constructor(code: string, entity?: string) {
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
