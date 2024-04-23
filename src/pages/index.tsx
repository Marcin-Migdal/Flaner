import { Navigate, createBrowserRouter } from "react-router-dom";
import React from "react";

import { PATH_CONSTRANTS } from "@utils/enums";
import { MainLayout } from "@components/index";

const HomePage = React.lazy(() => import("./Home"));
const SignInPage = React.lazy(() => import("./SignIn"));
const SignUpPage = React.lazy(() => import("./SignUp"));

const CommunityPage = React.lazy(() => import("./PageTilesView"));
const SearchFriendsPage = React.lazy(() => import("./Community/SearchFriends"));
const MyFriendsPage = React.lazy(() => import("./Community/MyFriends"));
const GroupsPage = React.lazy(() => import("./Community/Groups"));

const PlanningPage = React.lazy(() => import("./PageTilesView"));
const ToDoPage = React.lazy(() => import("./Planning/ToDo"));
const ShoppingPage = React.lazy(() => import("./Planning/Shopping"));
const ProductsPage = React.lazy(() => import("./Planning/Products"));

const SettingsPage = React.lazy(() => import("./Settings"));
const Page404 = React.lazy(() => import("./Page404"));

const routes = [
    { path: PATH_CONSTRANTS.HOME, element: <HomePage /> },
    { path: PATH_CONSTRANTS.SIGN_IN, element: <SignInPage /> },
    { path: PATH_CONSTRANTS.SIGN_UP, element: <SignUpPage /> },

    //! Community
    { path: PATH_CONSTRANTS.COMMUNITY, element: <CommunityPage /> },
    { path: PATH_CONSTRANTS.SEARCH_FRIENDS, element: <SearchFriendsPage /> },
    { path: PATH_CONSTRANTS.MY_FRIENDS, element: <MyFriendsPage /> },
    { path: PATH_CONSTRANTS.GROUPS, element: <GroupsPage /> },

    //! Products
    { path: PATH_CONSTRANTS.PLANNING, element: <PlanningPage /> },
    { path: PATH_CONSTRANTS.TODO, element: <ToDoPage /> },
    { path: PATH_CONSTRANTS.SHOPPING, element: <ShoppingPage /> },
    { path: PATH_CONSTRANTS.PRODUCTS, element: <ProductsPage /> },

    //! Settings
    { path: PATH_CONSTRANTS.SETTINGS, element: <SettingsPage /> },

    //! Errors
    { path: PATH_CONSTRANTS.PAGE_404, element: <Page404 /> },
    { path: "*", element: <Navigate to={PATH_CONSTRANTS.PAGE_404} /> },
];

const router = createBrowserRouter([
    {
        element: <MainLayout />,
        children: routes,
    },
]);

export default router;
