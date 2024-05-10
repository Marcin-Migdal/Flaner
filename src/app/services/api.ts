import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

export const firestoreApi = createApi({
    reducerPath: "firestoreApi",
    baseQuery: fakeBaseQuery(),

    tagTypes: ["Users", "Friend_Requests"],

    endpoints: () => ({}),
});
