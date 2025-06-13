import { useNavigate } from "react-router-dom";

import { useBreakpoint } from "@hooks";
import { PATH_CONSTRANTS } from "@utils/enums";

import { DesktopNavbar } from "./components/DesktopNavbar/DesktopNavbar";
import { MobileNavbar } from "./components/MobileNavbar/MobileNavbar";

import "./styles.scss";

export const Header = () => {
  const navigate = useNavigate();

  const isMobile = useBreakpoint(`(max-width: 768px)`);

  return (
    <div className={`header ${isMobile ? "mobile" : ""}`}>
      <h1 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{import.meta.env.VITE_APP_NAME}</h1>
      {!isMobile ? <DesktopNavbar /> : <MobileNavbar />}
    </div>
  );
};
