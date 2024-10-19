import { Button, Icon } from "@Marcin-Migdal/morti-component-library";
import { useNavigate } from "react-router-dom";

import { Page, SpinnerPlaceholder } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./styles.scss";

const Page404 = () => {
    const navigate = useNavigate();
    const { authUser } = useAppSelector(selectAuthorization);

    if (!authUser) return <SpinnerPlaceholder />;
    return (
        <Page className="page-404-container" flex center flex-column>
            <Icon icon={["fas", "circle-xmark"]} />
            <h3>Page does not exist</h3>
            <Button text="Homepage" onClick={() => navigate(PATH_CONSTRANTS.HOME)} variant="full" />
        </Page>
    );
};

export default Page404;
