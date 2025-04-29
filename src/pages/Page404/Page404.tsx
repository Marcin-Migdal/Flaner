import { Icon } from "@marcin-migdal/m-component-library";
import { useNavigate } from "react-router-dom";

import { selectAuthorization } from "../../app/slices";
import { CustomButton, SpinnerPlaceholder } from "../../components";
import { useAppSelector } from "../../hooks";
import { PATH_CONSTRANTS } from "../../utils/enums";

import "./styles.scss";

const Page404 = () => {
  const navigate = useNavigate();
  const { authUser } = useAppSelector(selectAuthorization);

  if (!authUser) {
    return <SpinnerPlaceholder />;
  }

  return (
    <div className="page page-404-container">
      <Icon className="not-found-icon" icon={["fas", "circle-xmark"]} />
      <h3>Page does not exist</h3>
      <CustomButton
        text="Homepage"
        onClick={() => navigate(PATH_CONSTRANTS.HOME)}
        variant="full"
        disableDefaultMargin
      />
    </div>
  );
};

export default Page404;
