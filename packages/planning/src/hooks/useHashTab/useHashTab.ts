import { useLocation, useNavigate } from "react-router";

/**
 * The active tab lives in the URL hash (`#recurring`), so a refresh or a shared link keeps it.
 * The first tab has no hash; an unknown hash opens the first tab.
 */
export const useHashTab = <Tab extends string>(tabs: readonly [Tab, ...Tab[]]) => {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();

  const isTab = (value: string): value is Tab => tabs.some((tab) => tab === value);
  const fromHash = hash.slice(1);
  const activeTab: Tab = isTab(fromHash) ? fromHash : tabs[0];

  // Accepts any string so it plugs straight into `Tabs` `onValueChange`
  const setTab = (value: string) => {
    if (!isTab(value)) return;
    navigate({ pathname, search, hash: value === tabs[0] ? "" : value }, { replace: true });
  };

  return [activeTab, setTab] as const;
};
