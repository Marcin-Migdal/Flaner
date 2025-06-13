import { Icon } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { NavigationNode, getNodeByPath } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

const PageTilesView = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pages: NavigationNode[] = getNodeByPath(window.location.pathname as PATH_CONSTRANTS)[0]?.subItems || [];

  return (
    <div className="page page-tile-view">
      {pages.map(({ text, path, icon }, index) => (
        <div key={index} className="page-tile" onClick={() => navigate(path)}>
          <div className="page-tile-content">
            <p>{t(text)}</p>
            {icon ? <Icon className={`tile-icon ${icon[1]}`} icon={icon} /> : <div className="tile-icon-placeholder" />}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PageTilesView;
