import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, UserCircle } from "lucide-react";

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export default function ChatHeader({ name, avatarUrl, isOnline }: ChatHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-background">
          <AvatarImage src={avatarUrl} alt={name} data-ai-hint="profile avatar" />
          <AvatarFallback>
            <UserCircle className="h-10 w-10 text-primary-foreground/80" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-base">{name}</h2>
          {isOnline && <p className="text-xs text-primary-foreground/90">Online</p>}
        </div>
      </div>
      <button aria-label="More options">
        <MoreVertical className="text-primary-foreground" />
      </button>
    </header>
  );
}
