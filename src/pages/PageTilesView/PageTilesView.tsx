import { useNavigate } from "react-router-dom";
import React, { MouseEvent } from "react";

import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.css";

const PageTilesView = () => {
    const navigate = useNavigate();

    const pagesUrl: PATH_CONSTRANTS[] = Object.values(PATH_CONSTRANTS).filter(
        (urls) => urls.startsWith(window.location.pathname) && urls !== window.location.pathname
    );

    const goTo = (to: PATH_CONSTRANTS, event: MouseEvent<HTMLElement>) => {
        navigate(to);
    };

    return (
        <div className="page-container page-tile-view">
            {pagesUrl.map((fullUrl, index) => {
                const strArr = fullUrl.split("/");
                return (
                    <div key={index} className="page-tile" onClick={(event) => goTo(fullUrl, event)}>
                        <div className="page-tile-content">{strArr[strArr.length - 1]}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default PageTilesView;
