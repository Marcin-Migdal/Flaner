import React from "react";
import { Navigate, RouteObject, createBrowserRouter } from "react-router-dom";

import { MainLayout, UnAuthorizedMainLayout } from "@components";
import { PATH_CONSTRANTS } from "@utils/enums";

const PageTilesView = React.lazy(() => import("./PageTilesView"));

const HomePage = React.lazy(() => import("./Home"));
const SignInPage = React.lazy(() => import("./SignIn"));
const SignUpPage = React.lazy(() => import("./SignUp"));

const AddFriendsPage = React.lazy(() => import("./Community/AddFriends"));
const MyFriendsPage = React.lazy(() => import("./Community/MyFriends"));
const GroupsPage = React.lazy(() => import("./Community/Groups"));

const ShoppingListsPage = React.lazy(() => import("./Planning/ShoppingLists"));
const ProductsPage = React.lazy(() => import("./Planning/Products"));

const SettingsPage = React.lazy(() => import("./Settings"));
const Page404 = React.lazy(() => import("./Page404"));

const unAuthorizedRouting: RouteObject[] = [
  { path: PATH_CONSTRANTS.SIGN_IN, element: <SignInPage /> },
  { path: PATH_CONSTRANTS.SIGN_UP, element: <SignUpPage /> },
];

const authorizedRouting: RouteObject[] = [
  { path: PATH_CONSTRANTS.HOME, element: <HomePage /> },

  //! Community
  { path: PATH_CONSTRANTS.COMMUNITY, element: <PageTilesView /> },
  { path: PATH_CONSTRANTS.ADD_FRIENDS, element: <AddFriendsPage /> },
  { path: PATH_CONSTRANTS.MY_FRIENDS, element: <MyFriendsPage /> },
  { path: PATH_CONSTRANTS.GROUPS, element: <GroupsPage /> },

  //! Products
  { path: PATH_CONSTRANTS.PLANNING, element: <PageTilesView /> },
  { path: PATH_CONSTRANTS.SHOPPING_LISTS, element: <ShoppingListsPage /> },
  { path: PATH_CONSTRANTS.PLANNING_SETTINGS, element: <PageTilesView /> },
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
    children: authorizedRouting,
  },
  {
    element: <UnAuthorizedMainLayout />,
    children: unAuthorizedRouting,
  },
]);

export default router;
