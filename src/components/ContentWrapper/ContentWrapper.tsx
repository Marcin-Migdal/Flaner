import { ReactElement, ReactNode } from "react";

import { UseQueryResult } from "./types";

import {
  ErrorPlaceholder,
  ErrorPlaceholderProps,
  MessagePlaceholder,
  MessagePlaceholderProps,
  SpinnerPlaceholder,
  SpinnerPlaceholderProps,
} from "../placeholders";

type ChildrenObject<T> = {
  data: T;
};

type Conditions = {
  isLoading?: boolean;
  isError?: boolean;
  isUninitialized?: boolean;
  noData?: boolean;
};

type ContentWrapperProps<T> = {
  query: UseQueryResult<T>;
  children: (childrenObject: ChildrenObject<T>) => ReactElement;
  placeholders?: Partial<Placeholders>;
  placeholdersConfig?: PlaceholdersConfig;
  conditions?: Conditions;
};

type PlaceholdersConfig = {
  spinner?: SpinnerPlaceholderProps;
  error?: ErrorPlaceholderProps;
  noData?: MessagePlaceholderProps;

  common?: SpinnerPlaceholderProps & ErrorPlaceholderProps & MessagePlaceholderProps;
};

type Placeholders = {
  isUninitialized: ReactNode;
  spinner: ReactNode;
  error: ReactNode;
  noData: ReactNode;
};

export const ContentWrapper = <T,>({
  query,
  children,
  placeholders: customPlaceholders,
  placeholdersConfig,
  conditions: customConditions,
}: ContentWrapperProps<T>) => {
  const placeholders: Placeholders = {
    isUninitialized: customPlaceholders?.isUninitialized ? customPlaceholders?.isUninitialized : null,
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
      <MessagePlaceholder {...placeholdersConfig?.common} {...placeholdersConfig?.noData} />
    ),
  };

  const conditions: Conditions = {
    isUninitialized: customConditions?.isUninitialized || query.isUninitialized,
    isLoading: customConditions?.isLoading || query.isLoading,
    isError: customConditions?.isError || query.isError,
    noData:
      customConditions?.noData ||
      (query.isSuccess && Array.isArray(query.data)
        ? query.data.length === 0
        : query.data === undefined || query.data === null),
  };

  if (conditions.isUninitialized) {
    return placeholders.isUninitialized;
  }

  if (conditions.isLoading) {
    return placeholders.spinner;
  }

  if (conditions.isError) {
    return placeholders.error;
  }

  if (conditions.noData) {
    return placeholders.noData;
  }

  return children({ data: query.data as T });
};
