import { Navigate, createBrowserRouter } from "react-router-dom";
import React from "react";

import { PATH_CONSTRANTS } from "@utils/enums";
import { Layout } from "@components/index";

const HomePage = React.lazy(() => import("./Home"));
const SignInPage = React.lazy(() => import("./SignIn"));
const SignUpPage = React.lazy(() => import("./SignUp"));
const Page404 = React.lazy(() => import("./Page404"));

const routes = [
    { path: PATH_CONSTRANTS.HOME, element: <HomePage /> },
    { path: PATH_CONSTRANTS.SIGN_IN, element: <SignInPage /> },
    { path: PATH_CONSTRANTS.SIGN_UP, element: <SignUpPage /> },
    { path: PATH_CONSTRANTS.PAGE_404, element: <Page404 /> },
    { path: "*", element: <Navigate to={PATH_CONSTRANTS.PAGE_404} /> },
];

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: routes,
    },
]);

export default router;
