import type { NavIconName } from "@flaner/shared/types";
import {
  ArrowLeftRight,
  Calendar,
  ChartPie,
  Disc,
  House,
  ListChecks,
  type LucideIcon,
  type LucideProps,
  PiggyBank,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

const icons: Record<NavIconName, LucideIcon> = {
  "arrow-left-right": ArrowLeftRight,
  calendar: Calendar,
  "chart-pie": ChartPie,
  disc: Disc,
  home: House,
  "list-checks": ListChecks,
  "piggy-bank": PiggyBank,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  users: Users,
  wallet: Wallet,
  wrench: Wrench,
};

export type NavIconProps = LucideProps & { name: NavIconName };

/** Renders a navigation icon by its route-handle name (`NavIconName`). */
export const NavIcon = ({ name, ...props }: NavIconProps) => {
  const Icon = icons[name];
  return <Icon {...props} />;
};
