import { Button } from "@Marcin-Migdal/morti-component-library";
import { useTranslation } from "react-i18next";
import React from "react";

import { signOut } from "@slices/authorization-slice";
import { useAppDispatch } from "@hooks/redux-hooks";

const Home = () => {
    //! sign out functionality should not be here
    const { t } = useTranslation(["common"]);
    const dispatch = useAppDispatch();

    const handleSignOut = () => dispatch(signOut({ t: t }));

    return (
        <div>
            <p>Home</p>
            <Button data-cy="sign-out-btn" text="Sign out" onClick={handleSignOut} />
        </div>
    );
};

export default Home;
