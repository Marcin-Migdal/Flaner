import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Suspense, useEffect } from "react";

import { SpinnerPlaceholder } from "../../placeholders";

import { AuthUserType, selectAuthorization, setAuthUser } from "@slices/authorization-slice";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { PATH_CONSTRANTS } from "@utils/enums";
import { fb } from "@firebase/firebase";
import { Header } from "./components/Header/Header";

export default function MainLayout() {
    const navigate = useNavigate();

    const { isLoading, authUser } = useAppSelector(selectAuthorization);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const unSubscribe = onAuthStateChanged(fb.auth.auth, (user) => {
            //Serializing user object before sending it to the reducer
            const serializedUser: AuthUserType = JSON.parse(JSON.stringify(user));
            dispatch(setAuthUser(serializedUser));
        });

        return unSubscribe;
    }, []);

    useEffect(() => {
        // check fetching current users is finished
        if (!isLoading) {
            const pathname = window.location.pathname;

            // if user does not exist, and current page is not one of the auth pages, navigate to sign-in page
            if (authUser === null && pathname !== PATH_CONSTRANTS.SIGN_IN && PATH_CONSTRANTS.SIGN_UP !== pathname) {
                navigate(PATH_CONSTRANTS.SIGN_IN);
            }
            // if user does exist, and current page is one of the auth pages, navigate to home page
            else if (authUser && (PATH_CONSTRANTS.SIGN_IN === pathname || PATH_CONSTRANTS.SIGN_UP === pathname)) {
                navigate(PATH_CONSTRANTS.HOME);
            }
        }
    }, [authUser, isLoading]);

    return (
        <>
            {authUser && <Header />}
            <main style={!authUser ? { height: "100%" } : { height: "calc(100% - var(--header-height))" }}>
                <Suspense fallback={<SpinnerPlaceholder />}>
                    <Outlet />
                </Suspense>
            </main>
        </>
    );
}
