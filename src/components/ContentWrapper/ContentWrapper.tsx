import { ReactElement } from "react";

import { ErrorPlaceholder, NoDataPlaceholder, SpinnerPlaceholder } from "../placeholders";
import { UseQueryResult } from "./types";

type ChildrenObject<T> = {
    data: T;
};

type ContentWrapper<T> = {
    query: UseQueryResult<T>;
    children: (childrenObject: ChildrenObject<T>) => ReactElement;
};

export const ContentWrapper = <T,>({ query, children }: ContentWrapper<T>) => {
    if (query.isFetching) return <SpinnerPlaceholder />;
    if (query.isError) return <ErrorPlaceholder />;
    if (query.isSuccess) return children({ data: query.data as T });
    return <NoDataPlaceholder />;
};
