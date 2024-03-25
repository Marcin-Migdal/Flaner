import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Suspense, useEffect } from "react";

import { UserType, setAuthUser } from "@slices/authorization-slice";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { PATH_CONSTRANTS } from "@utils/enums";
import { fb } from "@firebase/firebase";
import { Loader } from "../Loader";
import { Header } from "./Header";

export default function Layout() {
    const navigate = useNavigate();

    const { isLoading, authUser } = useAppSelector((store) => store.authorization);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const unSubscribe = onAuthStateChanged(fb.auth.auth, (user) => {
            //Serializing user object before sending it to the reducer
            const serializedUser: UserType = JSON.parse(JSON.stringify(user));
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
            <main style={{ height: "inherit" }}>
                <Suspense fallback={<Loader />}>
                    <Outlet />
                </Suspense>
            </main>
        </>
    );
}
