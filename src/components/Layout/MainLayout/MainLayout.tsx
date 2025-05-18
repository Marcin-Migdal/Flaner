import { Breadcrumb, CrumbType, capitalize } from "@marcin-migdal/m-component-library";
import { Suspense, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Header } from "@components";
import { useAppSelector, useBreakpoint } from "@hooks";
import { selectAuthorization } from "@slices";
import { PATH_CONSTRANTS } from "@utils/enums";

import { SpinnerPlaceholder } from "../../placeholders";

import "./styles.scss";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, isLoading } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const isMobile = useBreakpoint(`(max-width: 768px)`);

  const crumbs: CrumbType[] = useMemo(() => {
    const splitPathName = location.pathname.split("/");

    if (location.pathname === PATH_CONSTRANTS.HOME) {
      return [{ id: "index-home", label: t("Home"), path: PATH_CONSTRANTS.HOME, disabled: true }];
    }

    return splitPathName.map((crumb, index): CrumbType => {
      if (index === 0) {
        return { id: "index-home", label: t("Home"), path: PATH_CONSTRANTS.HOME };
      }

      const crumbPath = splitPathName.slice(0, index + 1).join("/");

      return {
        id: `index-${crumb}`,
        label: t(capitalize(crumb).replace("-", " ")),
        path: crumbPath,
        disabled: crumbPath === location.pathname,
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
      <Breadcrumb
        variant={isMobile ? "compact" : "default"}
        onClick={(crumb) => navigate(crumb.path)}
        crumbs={crumbs}
        className={`flaner-breadcrumb ${isMobile ? "mobile" : "desktop"}`}
      />
      <main>
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
