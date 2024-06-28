import { useNavigate } from "react-router-dom";

import { useBreakpoint } from "@hooks/useBreakpoint";
import { PATH_CONSTRANTS } from "@utils/enums";
import { DesktopNavbar } from "./components/DesktopNavbar/DesktopNavbar";
import { MobileNavbar } from "./components/MobileNavbar/MobileNavbar";

import "./styles.scss";

//* LIB 1
// TODO! Temporary solution, later add feature of, passing data to alert as openAlert argument, making it available in onConfirmBtnClick, onDeclineBtnClick
// TODO! figure out how to handle Error message translation

//* Flaner 2
// TODO! MyFriends => implementing new feature from lib Alert component, passing friendToDelete in openAlert function, deleting friendToDelete useState
// TODO! add error translations

// TODO! Separate translation from common file
//?          prepare components like ContentWrapper to take prop i18NameSpace like CustomButton
//?          create files for separate functionality/app translations, move translations to them

// TODO! email validation on email sign-up

// TODO! very basic settings functionality
//?          changing theme color
//?          changing language

//* LIB 2
// TODO! move navbar component used in header to lib

//* Flaner 3
// TODO! Implementing Products page
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
