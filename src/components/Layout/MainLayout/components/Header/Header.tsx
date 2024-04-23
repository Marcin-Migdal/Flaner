import { useNavigate } from "react-router-dom";

import { PATH_CONSTRANTS } from "@utils/enums";
import { HeaderList } from "./components/HeaderList";

import "./styles.scss";

// TODO! mobile view for header list
export const Header = () => {
    const navigate = useNavigate();

    return (
        <div className="header">
            <h2 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>{process.env.APP_NAME}</h2>
            <HeaderList />
        </div>
    );
};
