import { Button, Icon } from "@Marcin-Migdal/morti-component-library";
import { useNavigate } from "react-router-dom";
import React from "react";

import { PATH_CONSTRANTS } from "@utils/enums";
import { useAppSelector } from "@hooks/redux-hooks";
import { Loader } from "@components/index";

import "./styles.css";

const Page404 = () => {
    const navigate = useNavigate();
    const { authUser } = useAppSelector((store) => store.authorization);

    return (
        <>
            {!authUser ? (
                <Loader />
            ) : (
                <div className="page-404-container page-container center">
                    <Icon icon={["fas", "circle-xmark"]} />
                    <h3>Page does not exist</h3>
                    <Button text="Homepage" onClick={() => navigate(PATH_CONSTRANTS.HOME)} variant="full" />
                </div>
            )}
        </>
    );
};

export default Page404;
