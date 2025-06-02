import { Breadcrumb, CrumbType } from "@marcin-migdal/m-component-library";
import { Suspense, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Header } from "@components";
import { useAppSelector, useBreakpoint } from "@hooks";
import { selectAuthorization } from "@slices";
import { PATH_CONSTRANTS } from "@utils/enums";

import { SpinnerPlaceholder } from "../../placeholders";

import { useTranslation } from "react-i18next";
import "./styles.scss";

const toCamelCase = (str: string) => {
  return str
    .split("-")
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
};

export default function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, isLoading } = useAppSelector(selectAuthorization);

  const isMobile = useBreakpoint(`(max-width: 768px)`);

  const crumbs: CrumbType[] = useMemo(() => {
    const splitPathName = location.pathname.split("/");

    if (location.pathname === PATH_CONSTRANTS.HOME) {
      return [{ id: "index-home", label: t("nav.main.home"), path: PATH_CONSTRANTS.HOME, disabled: true }];
    }

    return splitPathName.map((crumb, index): CrumbType => {
      if (index === 0) {
        return { id: "index-home", label: t("nav.main.home"), path: PATH_CONSTRANTS.HOME };
      }

      const crumbPath = splitPathName.slice(0, index + 1).join("/");

      return {
        id: `index-${crumb}`,
        label: t(`nav.main.${toCamelCase(crumb)}`),
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
