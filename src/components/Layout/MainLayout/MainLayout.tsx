import { Suspense, useEffect, useMemo } from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { SpinnerPlaceholder } from "@components/placeholders";
import { useAppSelector } from "@hooks/redux-hooks";
import { Breadcrumb, capitalize, Crumb } from "@marcin-migdal/m-component-library";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import { useTranslation } from "react-i18next";
import { Header } from "./components/Header/Header";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, isLoading } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const crumbs: Crumb[] = useMemo(() => {
    const splitPathName = location.pathname.split("/");

    if (location.pathname === PATH_CONSTRANTS.HOME) {
      return [{ id: "index-home", label: t("Home"), path: PATH_CONSTRANTS.HOME }];
    }

    return splitPathName.map((crumb, index): Crumb => {
      if (index === 0) {
        return { id: "index-home", label: t("Home"), path: PATH_CONSTRANTS.HOME };
      }

      return {
        id: `index-${crumb}`,
        label: t(capitalize(crumb).replace("-", " ")),
        path: splitPathName.slice(0, index + 1).join("/"),
      };
    });
  }, [location.pathname]);

  useEffect(() => {
    const pathname = window.location.pathname;

    // if user is not signed in, and not in one of the auth pages, redirect to sign-in page
    if (
      !isLoading &&
      authUser === null &&
      pathname !== PATH_CONSTRANTS.SIGN_IN &&
      PATH_CONSTRANTS.SIGN_UP !== pathname
    ) {
      navigate(PATH_CONSTRANTS.SIGN_IN);
    }
  }, [authUser, isLoading]);

  if (isLoading) {
    return <SpinnerPlaceholder />;
  }

  return (
    <>
      <Header />
      <Breadcrumb onClick={(crumb) => navigate(crumb.path)} crumbs={crumbs} />
      <main style={{ height: "100%" }}>
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
