import type { UseInfiniteQueryOptions, InfiniteData } from "@tanstack/react-query";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export type FirestorePageParam<T = DocumentData> = QueryDocumentSnapshot<T, DocumentData> | undefined;

export type AppInfiniteQueryOptions<
  TResponse,
  TQueryKey extends readonly unknown[] = string[],
  TOmit extends string = never,
  TPageParam = FirestorePageParam<DocumentData>
> = Omit<
  UseInfiniteQueryOptions<
    TResponse,
    Error,
    InfiniteData<TResponse, TPageParam>,
    TQueryKey,
    TPageParam
  >,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam" | TOmit
>;
