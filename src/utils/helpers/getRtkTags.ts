type StringOrNumberKeys<T> = {
  [K in keyof T]: T[K] extends string | number ? K : never;
}[keyof T];

export const getRtkTags = <TData extends Record<string | number, unknown>, TTag extends string>(
  result: TData[] | undefined,
  field: StringOrNumberKeys<TData>,
  tag: TTag
): { type: TTag; id: string }[] => {
  if (!result) {
    return [{ type: tag, id: "List" }];
  }
  return [...result.map((resultItem) => ({ type: tag, id: resultItem[field] as string })), { type: tag, id: "List" }];
};
