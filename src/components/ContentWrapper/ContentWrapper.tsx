import { ReactElement } from "react";

import { ErrorPlaceholderProps, NoDataPlaceholderProps, SpinnerPlaceholderProps } from "@components/index";
import { ErrorPlaceholder, NoDataPlaceholder, SpinnerPlaceholder } from "../placeholders";
import { UseQueryResult } from "./types";

type ChildrenObject<T> = {
    data: T;
};

type Conditions = {
    isLoading?: boolean;
    isError?: boolean;
    isUninitialized?: boolean;
};

type ContentWrapper<T> = {
    query: UseQueryResult<T>;
    children: (childrenObject: ChildrenObject<T>) => ReactElement;
    placeholders?: Partial<Placeholders>;
    placeholdersConfig?: PlaceholdersConfig;
    conditions?: Conditions;
};

type PlaceholdersConfig = {
    spinner?: SpinnerPlaceholderProps;
    error?: ErrorPlaceholderProps;
    noData?: NoDataPlaceholderProps;
    common?: SpinnerPlaceholderProps & ErrorPlaceholderProps & NoDataPlaceholderProps;
};

type Placeholders = {
    spinner: ReactElement;
    error: ReactElement;
    noData: ReactElement;
};

export const ContentWrapper = <T,>({
    query,
    children,
    placeholders: customPlaceholders,
    placeholdersConfig,
    conditions: customConditions,
}: ContentWrapper<T>) => {
    const placeholders: Placeholders = {
        spinner: customPlaceholders?.spinner ? (
            customPlaceholders.spinner
        ) : (
            <SpinnerPlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.spinner} />
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

    const conditions: Conditions = {
        isLoading: customConditions !== undefined ? customConditions.isLoading : query.isLoading,
        isError: customConditions !== undefined ? customConditions.isError : query.isError,
        isUninitialized: customConditions !== undefined ? customConditions.isUninitialized : query.isUninitialized,
    };

    if (conditions.isLoading) return placeholders.spinner;
    if (conditions.isError) return placeholders.error;
    if (conditions.isUninitialized) return placeholders.noData;
    return children({ data: query.data as T });
};
