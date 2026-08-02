import { Avatar, AvatarFallback, AvatarImage, Button } from "@flaner/ui-components";
import { Loader2 } from "lucide-react";

interface RequestItemProps {
  avatarUrl?: string | null;
  username: string;
  acceptLabel: string;
  rejectLabel?: string;
  onAccept: () => void;
  onReject?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export function RequestItem({
  avatarUrl,
  username,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: RequestItemProps) {
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 transition-all gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="size-10 border border-border">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
          <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-bold text-sm">
            {getInitials(username)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm text-foreground/90 truncate">{username}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="xs"
          variant="brand"
          disabled={isAccepting || isRejecting}
          onClick={onAccept}
          className="h-8 rounded-lg px-3"
        >
          {isAccepting ? <Loader2 className="size-3.5 animate-spin" /> : acceptLabel}
        </Button>
        {onReject && rejectLabel && (
          <Button
            size="xs"
            variant="destructive"
            disabled={isAccepting || isRejecting}
            onClick={onReject}
            className="h-8 rounded-lg px-3"
          >
            {isRejecting ? <Loader2 className="size-3.5 animate-spin" /> : rejectLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
