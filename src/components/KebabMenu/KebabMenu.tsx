import { DropdownMenu, DropdownMenuOption, Icon } from "@marcin-migdal/m-component-library";

import "./styles.scss";

type KebabMenuProps = {
  options: DropdownMenuOption[] | undefined;
  triggerContainerClassName?: string;
};

export const KebabMenu = ({ options, triggerContainerClassName = "" }: KebabMenuProps) => {
  if (!options) {
    return null;
  }

  return (
    <DropdownMenu
      triggerContainerClassName={`kebab-menu-trigger ${triggerContainerClassName}`}
      options={options}
      openEvent="click"
      openPosition="auto-bottom"
      positionAlignment="center"
      hideDisabledOptions
      hideOnDisabledOptions
    >
      <Icon icon="ellipsis-vertical" />
    </DropdownMenu>
  );
};
