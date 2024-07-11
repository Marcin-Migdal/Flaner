import { useNavigate } from "react-router-dom";

import { useBreakpoint } from "@hooks/useBreakpoint";
import { PATH_CONSTRANTS } from "@utils/enums";
import { DesktopNavbar } from "./components/DesktopNavbar/DesktopNavbar";
import { MobileNavbar } from "./components/MobileNavbar/MobileNavbar";

import "./styles.scss";

//* Flaner 3
// TODO! mobile menu sub items onClick does not work

//* Flaner 4
// TODO! very basic settings functionality
//?          changing language
//?          changing theme color

//* LIB 2
// TODO! toast changes:
//!      toast background-color from: rgba(var(--toast-background-color), 0.15), to rgba(var(--toast-background-color), 0.3)
//!          overall toast visibility is bad because of the navbar, change the position to bottom left, and crank up the opacity to 0.3 as said in the previous point? or change the design
//!      toast duration should be longer

// TODO! export files refactor
// TODO! move navbar component used in header to lib

//* Flaner 5
// TODO! delete background-color: rgba(var(--toast-background-color), 0.3) !important;
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
