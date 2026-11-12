import { Avatar, Badge, Button, ListItem, Sheet, SheetTrigger, SidePanel } from "@flaner/ui-components";
import { UserPlus } from "lucide-react";
import {
  useAcceptJoinRequestMutation,
  useGetGroupRequestsQuery,
  useGetUsersQuery,
  useRejectJoinRequestMutation,
} from "../../../hooks";
import { useCommunityTranslations } from "../../../hooks/useCommunityTranslations";
import { useSheet } from "@flaner/shared/hooks";

interface RequestsSheetProps {
  groupId: string;
}

export function RequestsSheet({ groupId }: RequestsSheetProps) {
  const { t } = useCommunityTranslations();
  const { data: requests = [], isLoading } = useGetGroupRequestsQuery(groupId);
  const acceptRequestMutation = useAcceptJoinRequestMutation();
  const rejectRequestMutation = useRejectJoinRequestMutation();

  const requestUserIds = requests.map((r) => r.userId);
  const { data: usersData } = useGetUsersQuery(requestUserIds);

  const [isOpen, { setOpen }] = useSheet();

  if (requests.length === 0) return null; // Or show empty button

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-xl h-9 sm:h-10 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold relative flex-1 lg:flex-none flex items-center justify-center gap-1.5 cursor-pointer transition-all">
          <UserPlus className="size-3.5 sm:size-4 shrink-0" />
          <span>{t("requestsSheet.btnTitle")}</span>
          {requests.length > 0 && (
            <Badge shape="count" size="sm" variant="solid" className="absolute -top-1.5 -right-1.5">
              {requests.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SidePanel title={t("requestsSheet.title")} description={t("requestsSheet.desc")}>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <UserPlus className="size-4 text-brand-text" />
            {t("requestsSheet.btnTitlePending", { count: requests.length })}
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="text-center text-muted-foreground">{t("groupDetails.loading")}</div>
            </div>
          ) : requests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 pl-2">{t("requestsSheet.empty")}</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => {
                const userProfile = usersData?.find((u) => u.uid === req.userId);
                const displayUsername = userProfile?.username || req.userId;
                const displayAvatar = userProfile?.avatarUrl;

                const isAcceptingCurrent =
                  acceptRequestMutation.isPending && acceptRequestMutation.variables?.userId === req.userId;
                const isRejectingCurrent =
                  rejectRequestMutation.isPending && rejectRequestMutation.variables?.userId === req.userId;

                return (
                  <ListItem
                    key={req.userId}
                    leading={<Avatar variant="brand" name={displayUsername} src={displayAvatar} />}
                    title={displayUsername}
                    trailing={
                      <>
                        <Button
                          variant="brand"
                          isBusy={isAcceptingCurrent}
                          disabled={isRejectingCurrent}
                          onClick={() => acceptRequestMutation.mutate({ groupId, userId: req.userId })}
                        >
                          {t("requestsSheet.accept")}
                        </Button>
                        <Button
                          variant="destructive"
                          isBusy={isRejectingCurrent}
                          disabled={isAcceptingCurrent}
                          onClick={() => rejectRequestMutation.mutate({ groupId, userId: req.userId })}
                        >
                          {t("requestsSheet.reject")}
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </SidePanel>
    </Sheet>
  );
}
