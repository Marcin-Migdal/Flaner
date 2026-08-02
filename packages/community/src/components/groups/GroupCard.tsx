import { Lock, Users } from "lucide-react";
import { useNavigate } from "react-router";
import type { Group } from '../../api/groups';
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const { t } = useCommunityTranslations();
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(group.id)}
      className="relative flex flex-col p-5 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-brand/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl cursor-pointer group-card-hover overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand/20 to-brand/5" />
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-shrink-0 size-12 rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand font-bold text-lg shadow-inner">
          {group.avatarUrl ? (
            <img src={group.avatarUrl} alt={group.name} className="size-full object-cover rounded-xl" />
          ) : (
            group.name.substring(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold text-lg text-foreground truncate">{group.name}</h3>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5 gap-1.5">
            {group.type === "private" ? <Lock className="size-3" /> : <Users className="size-3" />}
            <span>{group.type === "private" ? t("groupsView.card.private") : t("groupsView.card.public")}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
        {group.description || t("groupsView.card.noDescription")}
      </p>
    </div>
  );
}
