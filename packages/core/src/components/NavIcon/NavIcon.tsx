import type { NavIconName } from "@flaner/shared/types";
import { Calendar, Disc, House, type LucideIcon, type LucideProps, Settings, ShoppingBag, Users, Wallet, Wrench } from "lucide-react";

const icons: Record<NavIconName, LucideIcon> = {
  calendar: Calendar,
  disc: Disc,
  home: House,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  users: Users,
  wallet: Wallet,
  wrench: Wrench,
};

type NavIconProps = LucideProps & { name: NavIconName };

export const NavIcon = ({ name, ...props }: NavIconProps) => {
  const Icon = icons[name];
  return <Icon {...props} />;
};
