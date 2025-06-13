type StringOrNumberKeys<T> = {
  [K in keyof T]: T[K] extends string | number ? K : never;
}[keyof T];

type Tag<TTag extends string> = { type: TTag; id: string };

export const getRtkTags = <TData extends Record<string | number, unknown>, TTag extends string>(
  result: TData[] | undefined,
  field: StringOrNumberKeys<TData>,
  tag: TTag,
  additionalTags: Tag<TTag>[] = []
): Tag<TTag>[] => {
  if (!result) {
    return [{ type: tag, id: "List" }];
  }
  return [
    ...result.map((resultItem) => ({ type: tag, id: resultItem[field] as string })),
    { type: tag, id: "List" },
    ...additionalTags,
  ];
};
