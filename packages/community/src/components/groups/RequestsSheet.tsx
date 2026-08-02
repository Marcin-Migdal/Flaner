import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flaner/ui-components";
import { UserPlus } from "lucide-react";
import {
  useAcceptJoinRequestMutation,
  useGetGroupRequestsQuery,
  useGetUsersQuery,
  useRejectJoinRequestMutation,
} from "../../hooks";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { useSheet } from "@flaner/shared/hooks";
import { RequestItem } from "../common/RequestItem";

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
        <Button variant="outline" className="rounded-xl relative">
          <UserPlus className="size-4" />
          {t("requestsSheet.btnTitle")}
          {requests.length > 0 && (
            <span className="absolute -top-2 -right-2 size-5 bg-brand text-white text-xs font-bold flex items-center justify-center rounded-full">
              {requests.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-6 bg-card/95 backdrop-blur-md border-l border-border flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-0 border-b border-border pb-4">
          <SheetTitle className="text-xl font-bold font-heading">{t("requestsSheet.title")}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">{t("requestsSheet.desc")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1 scrollbar-none">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <UserPlus className="size-4 text-brand" />
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
                    <RequestItem
                      key={req.userId}
                      username={displayUsername}
                      avatarUrl={displayAvatar}
                      acceptLabel={t("requestsSheet.accept")}
                      rejectLabel={t("requestsSheet.reject")}
                      onAccept={() => acceptRequestMutation.mutate({ groupId, userId: req.userId })}
                      onReject={() => rejectRequestMutation.mutate({ groupId, userId: req.userId })}
                      isAccepting={isAcceptingCurrent}
                      isRejecting={isRejectingCurrent}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
