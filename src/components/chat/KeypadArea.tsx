import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Mic, Send, Smile } from "lucide-react";

interface KeypadAreaProps {
  isSimulating: boolean; 
  isRecordingAudio: boolean;
  typedText: string; 
  onSendMessage?: () => void; 
  showSendButton: boolean;
}

export default function KeypadArea({ 
  isSimulating, 
  isRecordingAudio, 
  typedText, 
  onSendMessage,
  showSendButton
}: KeypadAreaProps) {
  return (
    <footer className="bg-background p-3 border-t flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Emoji">
        <Smile className="text-muted-foreground" />
      </Button>
      
      <div className="flex-grow bg-input dark:bg-card rounded-full px-4 py-2 flex items-center text-sm min-h-[40px]">
        {isRecordingAudio ? (
          <div className="flex items-center text-red-500 w-full">
            <Mic size={20} className="mr-2 animate-pulse" />
            Recording audio...
          </div>
        ) : (
          <span className={`flex-grow ${typedText ? 'text-foreground' : 'text-muted-foreground'}`}>
            {typedText || "Type a message..."}
          </span>
        )}
        {!isRecordingAudio && !typedText && (
          <Button variant="ghost" size="icon" aria-label="Attach file" className="ml-auto">
            <Paperclip className="text-muted-foreground" />
          </Button>
        )}
      </div>

      {showSendButton && !isRecordingAudio ? (
        <Button size="icon" aria-label="Send message" onClick={onSendMessage} disabled={!typedText || isSimulating} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Send />
        </Button>
      ) : (
        <Button size="icon" aria-label={isRecordingAudio ? "Stop recording" : "Record audio"} disabled={isSimulating && !isRecordingAudio} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Mic />
        </Button>
      )}
    </footer>
  );
}
