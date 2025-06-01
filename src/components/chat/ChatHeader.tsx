
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Video, Phone, MoreVertical } from "lucide-react";

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
          {isOnline && <p className="text-xs text-primary-foreground/90">online</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button aria-label="Video call" className="focus:outline-none p-1 rounded-full hover:bg-primary-foreground/10">
          <Video size={22} className="text-primary-foreground" />
        </button>
        <button aria-label="Voice call" className="focus:outline-none p-1 rounded-full hover:bg-primary-foreground/10">
          <Phone size={22} className="text-primary-foreground" />
        </button>
        <button aria-label="More options" className="focus:outline-none p-1 rounded-full hover:bg-primary-foreground/10">
          <MoreVertical size={22} className="text-primary-foreground" />
        </button>
      </div>
    </header>
  );
}
