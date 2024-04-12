import { Icon } from "@Marcin-Migdal/morti-component-library";
import { useNavigate } from "react-router-dom";

import { getNodeByPath, NavigationNode } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

const PageTilesView = () => {
    const navigate = useNavigate();

    const pages: NavigationNode[] = getNodeByPath(window.location.pathname as PATH_CONSTRANTS)[0]?.subItems || [];

    return (
        <div className="page-container page-tile-view">
            {pages.map(({ text, path, icon }, index) => (
                <div key={index} className="page-tile" onClick={() => navigate(path)}>
                    <div className="page-tile-content">
                        <p>{text}</p>
                        {icon ? <Icon className={`tile-icon ${icon[1]}`} icon={icon} /> : <div className="tile-icon-placeholder" />}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PageTilesView;
