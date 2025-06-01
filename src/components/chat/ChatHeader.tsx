
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
      <div className="flex items-center gap-1 sm:gap-2">
        <button 
          aria-label="More options"
          className="p-1 rounded-full hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
        >
          <MoreVertical size={20} className="text-primary-foreground" />
        </button>
      </div>
    </header>
  );
}

