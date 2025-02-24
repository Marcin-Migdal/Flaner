import { Accordion } from "@marcin-migdal/m-component-library";

import "./styles.scss";

type AccordionSettingsSectionToggleProps = {
  title: string;
  description: string;
};

export const AccordionSettingsSectionToggle = ({ title, description }: AccordionSettingsSectionToggleProps) => {
  return (
    <Accordion.Toggle>
      <div className="settings-section-toggle-content">
        <h4 className="settings-section-title">{title}</h4>
        <p className="settings-section-subtitle">{description}</p>
      </div>
    </Accordion.Toggle>
  );
};
