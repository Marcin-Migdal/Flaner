import { Icon } from "@marcin-migdal/m-component-library";
import "./styles.scss";

export type CategoryType = {
  id: string;
  label: string;
  icon: any;
};

type CategoryProps = {
  category: CategoryType;
};

export const Category = ({ category }: CategoryProps) => {
  return (
    <div className="category">
      <Icon icon={category.icon} />
      <span className="category-name">{category.label}</span>
      <Icon className="context-menu-icon" icon="ellipsis-vertical" />
    </div>
  );
};
