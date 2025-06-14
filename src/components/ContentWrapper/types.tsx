export type UseQueryResult<T> = {
  // Base query state
  originalArgs?: unknown; // Arguments passed to the query
  data?: T; // The latest returned result regardless of hook arg, if present
  currentData?: T; // The latest returned result for the current hook arg, if present
  error?: unknown; // Error result if present
  requestId?: string; // A string generated by RTK Query
  endpointName?: string; // The name of the given endpoint for the query
  startedTimeStamp?: number; // Timestamp for when the query was initiated
  fulfilledTimeStamp?: number; // Timestamp for when the query was completed

  // Derived request status booleans
  isUninitialized: boolean; // Query has not started yet.
  isLoading: boolean; // Query is currently loading for the first time. No data yet.
  isFetching: boolean; // Query is currently fetching, but might have data from an earlier request.
  isSuccess: boolean; // Query has data from a successful load.
  isError: boolean; // Query is currently in an "error" state.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refetch: () => any; // A function to force refetch the query - returns a Promise with additional methods
};
