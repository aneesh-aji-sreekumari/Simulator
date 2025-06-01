
"use client";

import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";

interface AppHeaderProps {
  isFullScreenChat: boolean;
  onToggleFullScreen: () => void;
}

export default function AppHeader({ isFullScreenChat, onToggleFullScreen }: AppHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground p-3 shadow-md flex items-center justify-between sticky top-0 z-40">
      <h1 className="text-xl font-semibold">ChatterSim</h1>
      <Button
        onClick={onToggleFullScreen}
        variant="ghost"
        size="icon"
        aria-label={isFullScreenChat ? "Exit full screen chat" : "Enter full screen chat"}
        className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
      >
        {isFullScreenChat ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </Button>
    </header>
  );
}
