import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";

export default function UnAuthorizedMainLayout() {
  const navigate = useNavigate();
  const { authUser, isLoading } = useAppSelector(selectAuthorization);

  useEffect(() => {
    const pathname = window.location.pathname;

    // if user is signed in, and current page is one of the auth pages, redirect to home page
    if (authUser && !isLoading && (PATH_CONSTRANTS.SIGN_IN === pathname || PATH_CONSTRANTS.SIGN_UP === pathname)) {
      navigate(PATH_CONSTRANTS.HOME);
    }
  }, [authUser, isLoading]);

  return (
    <main>
      <Suspense>
        <Outlet />
      </Suspense>
    </main>
  );
}
