import { ProgressSpinner } from "@Marcin-Migdal/morti-component-library";
import React from "react";

import "../../commonAssets/css/layout.scss";

export const Loader = () => {
    return (
        <div className="page-container center ">
            <ProgressSpinner />
        </div>
    );
};
