import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { SpinnerPlaceholder } from "@components/placeholders";
import { useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import { Header } from "./components/Header/Header";

export default function MainLayout() {
    const navigate = useNavigate();
    const { authUser, isLoading } = useAppSelector(selectAuthorization);

    useEffect(() => {
        const pathname = window.location.pathname;

        // if user is not signed in, and not in one of the auth pages, redirect to sign-in page
        if (!isLoading && authUser === null && pathname !== PATH_CONSTRANTS.SIGN_IN && PATH_CONSTRANTS.SIGN_UP !== pathname) {
            navigate(PATH_CONSTRANTS.SIGN_IN);
        }
    }, [authUser, isLoading]);

    if (isLoading) {
        return <SpinnerPlaceholder />;
    }

    return (
        <>
            <Header />
            <main style={{ height: "calc(100% - var(--header-height))" }}>
                <Suspense>
                    <Outlet />
                </Suspense>
            </main>
        </>
    );
}
