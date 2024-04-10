import { useNavigate } from "react-router-dom";
import React, { MouseEvent } from "react";

import { HeaderList } from "./components/HeaderList";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

// TODO! do naprawy tile view, szerokość tile jest zła, ustawić ją na procenty nie na vw
//? ogarnąć jak to podzielić w zakupy page, na listę zakupów, oraz produkty, jakieś tab'y?

export const Header = () => {
    const navigate = useNavigate();

    const goTo = (to: PATH_CONSTRANTS, _event: MouseEvent<HTMLElement>) => {
        navigate(to);
    };

    return (
        <div className="header">
            <h2 onClick={(event) => goTo(PATH_CONSTRANTS.HOME, event)}>{process.env.APP_NAME}</h2>
            <HeaderList goTo={goTo} />
        </div>
    );
};
