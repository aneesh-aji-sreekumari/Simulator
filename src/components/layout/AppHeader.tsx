
"use client";

import { Button } from "@/components/ui/button";
import { Maximize, Minimize, PlayCircle, StopCircle, RefreshCw, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

interface AppHeaderProps {
  isFullScreenChat: boolean;
  onToggleFullScreen: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
  canSimulate: boolean; // True if queue has items
  currentTheme: string;
  onToggleTheme: () => void;
}

export default function AppHeader({
  isFullScreenChat,
  onToggleFullScreen,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  isSimulating,
  canSimulate,
  currentTheme,
  onToggleTheme,
}: AppHeaderProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <header className="bg-primary text-primary-foreground p-3 shadow-md flex items-center justify-between sticky top-0 z-40">
      <h1 className="text-xl font-semibold">ChatterSim</h1>
      <div className="flex items-center gap-2">
        <Button
          onClick={onStartSimulation}
          variant="ghost"
          size="sm"
          disabled={isSimulating || !canSimulate}
          aria-label="Start chat simulation"
          className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          title="Start Simulation"
        >
          <PlayCircle className="mr-1 h-5 w-5" />
          {isSimulating ? "Simulating..." : "Start"}
        </Button>
        <Button
          onClick={onStopSimulation}
          variant="ghost"
          size="iconSm"
          disabled={!isSimulating}
          aria-label="Stop chat simulation"
          className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          title="Stop Simulation"
        >
          <StopCircle className="h-5 w-5" />
        </Button>
        <Button
          onClick={onResetSimulation}
          variant="ghost"
          size="iconSm"
          disabled={isSimulating && !canSimulate}
          aria-label="Reset chat simulation"
          className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          title="Reset Simulation"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>

        <span className="w-px h-6 bg-primary-foreground/30 mx-1"></span>

        <Button
          onClick={onToggleTheme}
          variant="ghost"
          size="iconSm"
          aria-label={currentTheme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
          className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          title={currentTheme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {hasMounted ? (currentTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />) : <div className="h-5 w-5" /> } {/* Placeholder or null during SSR/initial mount */}
        </Button>

        <Button
          onClick={onToggleFullScreen}
          variant="ghost"
          size="iconSm"
          aria-label={isFullScreenChat ? "Exit full screen chat" : "Enter full screen chat"}
          className="hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          title={isFullScreenChat ? "Exit Full Screen" : "Enter Full Screen"}
        >
          {isFullScreenChat ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
