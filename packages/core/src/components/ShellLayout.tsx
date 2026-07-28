import { cn, fb, useAuth, useTheme, MFE_NAMES, type NavigationItem } from "@flaner-v2/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  LoadingFallback,
  Profile,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@flaner-v2/ui-components";
import { doc, updateDoc } from "firebase/firestore";
import {
  ChevronRight,
  ChevronsUpDown,
  Globe,
  LogOut,
  Settings,
  SunMoon,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigation } from "react-router";
import { loadMfeNavigation } from "../mf";
import { NotificationsPopover } from "./notifications/NotificationsPopover";

const HOME_NAV_ITEM: NavigationItem = { path: "/", labelKey: "nav.home", icon: "home" };

export function ShellLayout() {
  const { user, signOutUser, updateUser } = useAuth();
  const { t, i18n } = useTranslation("common");
  const { isDark, setTheme } = useTheme();
  const navigation = useNavigation();
  const location = useLocation();
  const isNavigating = navigation.state === "loading";

  const [navItems, setNavItems] = useState<NavigationItem[]>([HOME_NAV_ITEM]);

  // Track expanded menu items (using path as key)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "/community": true, // expanded by default
  });

  useEffect(() => {
    async function loadNavigation() {
      const mfeNavs = await Promise.all(
        Object.values(MFE_NAMES)
          .filter((name) => name !== MFE_NAMES.SETTINGS)
          .map((mfeName) => loadMfeNavigation(mfeName))
      );
      setNavItems([
        HOME_NAV_ITEM,
        ...mfeNavs.flat()
      ]);
    }
    loadNavigation();
  }, []);

  useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  const toggleExpanded = (path: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const isLinkActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLanguageChange = async (nextLang: "pl" | "en") => {
    i18n.changeLanguage(nextLang);
    if (user?.uid) {
      try {
        await updateDoc(doc(fb.firestore, "users", user.uid), {
          language: nextLang,
        });
        updateUser({ language: nextLang });
      } catch (err) {
        console.error("Failed to persist language change", err);
      }
    }
  };

  const handleThemeChange = async (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    if (user?.uid) {
      try {
        await updateDoc(doc(fb.firestore, "users", user.uid), {
          darkMode: nextTheme === "dark",
        });
        updateUser({ darkMode: nextTheme === "dark" });
      } catch (err) {
        console.error("Failed to persist theme change", err);
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        {/* Collapsible Left Sidebar */}
        <Sidebar>
          {/* Sidebar Header / Logo */}
          <SidebarHeader className="h-14 border-b border-sidebar-border/50 flex items-center justify-between px-2">
            <NavLink to="/" className="flex items-center gap-2.5 w-full focus:outline-none overflow-hidden">
              <div className="size-[39px] rounded-md bg-brand flex items-center justify-center font-black text-zinc-950 text-xl shadow-md shadow-brand/15 shrink-0 select-none">
                F
              </div>
              <span className="text-2xl font-black tracking-wider text-brand truncate select-none">FLANER</span>
            </NavLink>
          </SidebarHeader>

          {/* Sidebar Navigation Links */}
          <SidebarContent className="px-2 py-2">
            <SidebarMenu>
              {navItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems[item.path] || false;
                
                // Convert PascalCase icon name to kebab-case for DynamicIcon
                const iconName = item.icon.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

                return (
                  <SidebarMenuItem key={item.path}>
                    <div className="relative w-full flex items-center">
                      <SidebarMenuButton asChild isActive={isLinkActive(item.path)} tooltip={t(item.labelKey)}>
                        <NavLink to={item.path}>
                          <DynamicIcon name={iconName as any} />
                          <span>{t(item.labelKey)}</span>
                        </NavLink>
                      </SidebarMenuButton>

                      {hasChildren && (
                        <SidebarMenuAction onClick={(e) => toggleExpanded(item.path, e)}>
                          <ChevronRight
                            className={cn("size-4 transition-transform duration-200", isExpanded && "rotate-90")}
                          />
                        </SidebarMenuAction>
                      )}
                    </div>

                    {hasChildren && isExpanded && (
                      <SidebarMenuSub>
                        {item.children!.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.path}>
                            <SidebarMenuSubButton asChild isActive={location.pathname === subItem.path}>
                              <NavLink to={subItem.path}>
                                <span>{t(subItem.labelKey)}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Sidebar Footer with Profile Dropdown */}
          <SidebarFooter>
            <SidebarMenu>
              <NotificationsPopover />
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground pl-[3px] pr-2.5"
                      tooltip={t("nav.profile")}
                    >
                      <Profile
                        username={user?.username}
                        avatarUrl={user?.avatarUrl}
                        size="sm"
                        showName={true}
                        nameClassName=""
                      />
                      <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[var(--sidebar-width)] min-w-[200px]"
                    side="right"
                    align="end"
                    sideOffset={6}
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-foreground">{user?.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Globe className="size-4 mr-2" />
                        <span>{t("nav.language")}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleLanguageChange("pl")}
                          className={cn(i18n.language === "pl" && "text-brand font-semibold")}
                        >
                          {t("nav.langPl")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleLanguageChange("en")}
                          className={cn(i18n.language === "en" && "text-brand font-semibold")}
                        >
                          {t("nav.langEn")}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <SunMoon className="size-4 mr-2" />
                        <span>{t("nav.theme")}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleThemeChange("light")}
                          className={cn(!isDark && "text-brand font-semibold")}
                        >
                          {t("nav.themeLight")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleThemeChange("dark")}
                          className={cn(isDark && "text-brand font-semibold")}
                        >
                          {t("nav.themeDark")}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NavLink to={`/${MFE_NAMES.SETTINGS}`} className="w-full flex items-center">
                        <Settings className="size-4 mr-2" />
                        <span>{t("nav.settings")}</span>
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => signOutUser()}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <LogOut className="size-4 mr-2" />
                      <span>{t("nav.signOut")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Layout Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Mobile Header (Visible only on mobile screen widths) */}
          <header className="flex md:hidden sticky top-0 z-40 h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-lg font-black tracking-wider text-brand select-none">FLANER</span>
            </div>
          </header>

          {/* Page Container */}
          <div className="flex-1 relative flex flex-col">
            {/* Desktop Floating Trigger Button (Visible only on desktop, positioned top-left of content) */}
            <div className="hidden md:block absolute top-4 left-6 z-30">
              <SidebarTrigger />
            </div>

            <main className="flex-1 py-8 md:pt-16 px-6 overflow-x-hidden">
              {isNavigating ? (
                <LoadingFallback />
              ) : (
                <Suspense fallback={<LoadingFallback />}>
                  <Outlet />
                </Suspense>
              )}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default ShellLayout;
