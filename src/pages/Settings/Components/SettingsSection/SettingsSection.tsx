import { PropsWithChildren } from "react";

import "./styles.scss";

type SettingsSectionProps = {
    title?: string;
    description?: string;
};

export const SettingsSection = ({ title, description, children }: PropsWithChildren<SettingsSectionProps>) => {
    return (
        <div className="settings-section">
            {title && <h3 className="settings-section-title">{title}</h3>}
            {description && <p className="settings-section-subtitle">{description}</p>}

            {children}

            <hr />
        </div>
    );
};
