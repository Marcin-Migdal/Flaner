import { Globe, Lock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { useTranslation } from "react-i18next";

export interface GroupSearchResultItemProps {
  avatarUrl?: string | null;
  name: string;
  requiresApproval: boolean;
  membersCount?: number;
  privateGroupText?: string;
  publicGroupText?: string;
  membersCountText?: string;
}

export function GroupSearchResultItem({
  avatarUrl,
  name,
  requiresApproval,
  membersCount = 1,
  privateGroupText,
  publicGroupText,
  membersCountText,
}: GroupSearchResultItemProps) {
  const { t } = useTranslation("common");

  const defaultPrivateGroupText = privateGroupText || t("community.groups.private", { defaultValue: "Wymaga akceptacji" });
  const defaultPublicGroupText = publicGroupText || t("community.groups.public", { defaultValue: "Publiczna" });
  const defaultMembersCountText = membersCountText || t("community.groups.members", { defaultValue: "członk." });

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-10 rounded-xl border border-border/50">
        <AvatarImage src={avatarUrl || ""} alt={name} />
        <AvatarFallback className="rounded-xl bg-muted/50 text-muted-foreground">
          <Users className="size-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-semibold truncate text-foreground">{name}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          {requiresApproval ? (
            <Lock className="size-3 text-amber-500" />
          ) : (
            <Globe className="size-3" />
          )}
          <span className="truncate">
            {requiresApproval ? defaultPrivateGroupText : defaultPublicGroupText}
          </span>
          <span className="opacity-50">&bull;</span>
          <span>{membersCount} {defaultMembersCountText}</span>
        </div>
      </div>
    </div>
  );
}
