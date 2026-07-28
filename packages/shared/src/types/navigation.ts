export type NavigationItem = {
  path: string;
  labelKey: string;
  icon: string;
  children?: NavigationItem[];
}
