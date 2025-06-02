import { Button, Icon } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SpinnerPlaceholder } from "@components";
import { useAppSelector } from "@hooks";
import { selectAuthorization } from "@slices";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

const Page404 = () => {
  const navigate = useNavigate();
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  if (!authUser) {
    return <SpinnerPlaceholder />;
  }

  return (
    <div className="page page-404-container">
      <Icon className="not-found-icon" icon={["fas", "circle-xmark"]} />
      <h3>{t("error.page404Title")}</h3>
      <Button
        text={t("nav.main.home")}
        onClick={() => navigate(PATH_CONSTRANTS.HOME)}
        variant="full"
        disableDefaultMargin
      />
    </div>
  );
};

export default Page404;
