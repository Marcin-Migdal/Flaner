import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

export const firestoreApi = createApi({
    reducerPath: "firestoreApi",
    baseQuery: fakeBaseQuery(),

    tagTypes: [
        "Users",
        "Searched_Users",
        "Sent_Friend_Requests",
        "Received_Friend_Requests",
        "Friends",
        "Unread-Notifications-Count",
        "Unread-Notifications",
        "All-Notifications",
    ],

    endpoints: () => ({}),
});
