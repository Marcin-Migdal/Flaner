import { useNavigate } from "react-router-dom";

import { useBreakpoint } from "@hooks/useBreakpoint";
import { PATH_CONSTRANTS } from "@utils/enums";
import { DesktopNavbar } from "./components/DesktopNavbar/DesktopNavbar";
import { MobileNavbar } from "./components/MobileNavbar/MobileNavbar";

import "./styles.scss";

//* Flaner 3
// TODO! email validation on email sign-up

//* Flaner 4
// TODO! very basic settings functionality
//?          changing theme color
//?          changing language

//* LIB 2
// TODO! export files refactor
// TODO! move navbar component used in header to lib

//* Flaner 5
// TODO! Implementing Products page

//* Flaner 6
// TODO! Implementing Shopping page

export const Header = () => {
    const navigate = useNavigate();

    const isMobile = useBreakpoint(`(max-width: 768px)`);

    return (
        <div className="header">
            <h1 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{process.env.APP_NAME}</h1>
            {!isMobile ? <DesktopNavbar /> : <MobileNavbar />}
        </div>
    );
};
