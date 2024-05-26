import { ReactElement } from "react";

import { ErrorPlaceholderProps, NoDataPlaceholderProps, SpinnerPlaceholderProps } from "@components/index";
import { ErrorPlaceholder, NoDataPlaceholder, SpinnerPlaceholder, TransparentSpinnerPlaceholder } from "../placeholders";
import { UseQueryResult } from "./types";

type ChildrenObject<T> = {
    data: T;
};

type ContentWrapper<T> = {
    query: UseQueryResult<T>;
    children: (childrenObject: ChildrenObject<T>) => ReactElement;
    placeholders?: Partial<Placeholders>;
    placeholdersConfig?: PlaceholdersConfig;
};

type PlaceholdersConfig = {
    spinner?: SpinnerPlaceholderProps;
    transparentSpinner?: SpinnerPlaceholderProps;
    error?: ErrorPlaceholderProps;
    noData?: NoDataPlaceholderProps;
    common?: SpinnerPlaceholderProps & ErrorPlaceholderProps & NoDataPlaceholderProps;
};

type Placeholders = {
    spinner: ReactElement;
    transparentSpinner: ReactElement;
    error: ReactElement;
    noData: ReactElement;
};

export const ContentWrapper = <T,>({ query, children, placeholders: customPlaceholders, placeholdersConfig }: ContentWrapper<T>) => {
    const placeholders: Placeholders = {
        spinner: customPlaceholders?.spinner ? (
            customPlaceholders.spinner
        ) : (
            <SpinnerPlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.spinner} />
        ),
        transparentSpinner: customPlaceholders?.transparentSpinner ? (
            customPlaceholders.transparentSpinner
        ) : (
            <TransparentSpinnerPlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.transparentSpinner}>
                {children({ data: query.data as T })}
            </TransparentSpinnerPlaceholder>
        ),
        error: customPlaceholders?.error ? (
            customPlaceholders.error
        ) : (
            <ErrorPlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.error} />
        ),
        noData: customPlaceholders?.noData ? (
            customPlaceholders.noData
        ) : (
            <NoDataPlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.noData} />
        ),
    };

    if (query.isLoading) return placeholders.spinner;
    if (query.isFetching) return placeholders.transparentSpinner;
    if (query.isError) return placeholders.error;
    if (query.isUninitialized) return placeholders.noData;
    return children({ data: query.data as T });
};
