import { Button, Icon } from "@marcin-migdal/m-component-library";
import { useNavigate } from "react-router-dom";

import { SpinnerPlaceholder } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

const Page404 = () => {
  const navigate = useNavigate();
  const { authUser } = useAppSelector(selectAuthorization);

  if (!authUser) {
    return <SpinnerPlaceholder />;
  }

  return (
    <div className="page page-404-container">
      <Icon icon={["fas", "circle-xmark"]} />
      <h3>Page does not exist</h3>
      <Button text="Homepage" onClick={() => navigate(PATH_CONSTRANTS.HOME)} variant="full" />
    </div>
  );
};

export default Page404;
