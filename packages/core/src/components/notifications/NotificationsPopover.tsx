import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SidebarMenuButton,
  SidebarMenuItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useSidebar,
} from "@flaner/ui-components";
import { Bell, Check, Inbox, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../hooks/useNotifications";
import { useReadNotifications } from "../../hooks";
import { NotificationCard } from "./NotificationCard";

export function NotificationsPopover() {
  const { isMobile } = useSidebar();
  const { t } = useTranslation("common");
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const {
    data: readData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: readLoading,
  } = useReadNotifications();
  const [open, setOpen] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = readData?.pages.flatMap((page) => page.notifications) || [];

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton tooltip={t("nav.notifications", { defaultValue: "Powiadomienia" })}>
            <div className="relative flex items-center justify-center">
              <Bell className="size-4 shrink-0" />
              {unreadCount > 0 && <div className="absolute -top-1 -right-1 size-2 bg-brand rounded-full" />}
            </div>
            <span>{t("nav.notifications", { defaultValue: "Powiadomienia" })}</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-brand text-brand-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-2.5rem)] max-w-[340px] sm:w-96 p-0 rounded-xl border-border/50 shadow-lg overflow-hidden flex flex-col"
          side={isMobile ? "top" : "right"}
          align={isMobile ? "center" : "end"}
          sideOffset={isMobile ? 10 : 8}
        >
          <Tabs defaultValue="new" className="w-full flex flex-col h-[430px]">
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/20 shrink-0 gap-2">
              <TabsList className="h-8 bg-muted/40 shrink-0">
                <TabsTrigger value="new" className="text-xs">
                  {t("notifications.tabs.new")}
                  {unreadCount > 0 && (
                    <span className="ml-1.5 bg-brand/20 text-brand px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs">
                  {t("notifications.tabs.read")}
                </TabsTrigger>
              </TabsList>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-lg shrink-0 px-2.5 flex items-center gap-1.5 font-semibold transition-all shadow-sm"
                  onClick={() => markAllAsRead()}
                  title={t("notifications.markAllRead")}
                  aria-label={t("notifications.markAllRead")}
                >
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">{t("notifications.markAllRead")}</span>
                </Button>
              )}
            </div>

            <TabsContent value="new" className="m-0 p-2 overflow-y-auto outline-none flex-1">
              {unreadNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="bg-muted/50 p-3 rounded-full mb-3">
                    <Bell className="size-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {t("notifications.empty.title", { defaultValue: "Jesteś na bieżąco!" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("notifications.empty.subtitle", { defaultValue: "Nie masz żadnych nowych powiadomień." })}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {unreadNotifications.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      onRead={markAsRead}
                      onClosePopover={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="read" className="m-0 p-2 overflow-y-auto outline-none flex-1">
              {readLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
                </div>
              ) : readNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="bg-muted/50 p-3 rounded-full mb-3">
                    <Inbox className="size-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {t("notifications.readPlaceholder.title", { defaultValue: "Brak historii" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                    {t("notifications.readPlaceholder.subtitle", {
                      defaultValue: "Tutaj znajdziesz swoje przeczytane powiadomienia.",
                    })}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 flex flex-col">
                  {readNotifications.map((notif) => (
                    <div key={notif.id} className="opacity-80 hover:opacity-100 transition-opacity">
                      <NotificationCard
                        notification={notif}
                        onRead={markAsRead}
                        onClosePopover={() => setOpen(false)}
                      />
                    </div>
                  ))}

                  {hasNextPage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground shrink-0"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        t("notifications.loadMore")
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}
