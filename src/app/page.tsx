
"use client";

import { useState, useEffect, useRef, useCallback, ChangeEvent } from "react";
import type { Message, MessageQueueItem } from "@/types/chat";
import { messageQueue as defaultMessageQueue } from "@/lib/sample-chat-data";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatWindow from "@/components/chat/ChatWindow";
import KeypadArea from "@/components/chat/KeypadArea";
import MessageComposer from "@/components/composer/MessageComposer";
import { Button } from "@/components/ui/button";
import { PlayCircle, UserCircle, FileUp, XCircle, MoreVertical, Edit2, Trash2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";


const TYPING_SPEED_MS = 80;
const FRIEND_TYPING_INDICATOR_DURATION_MS = 1500;
const READING_WORDS_PER_MINUTE = 200;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sound effect file paths (assuming they are in public/sounds/)
const SOUND_MY_MESSAGE_SENT = "/sounds/my_message_sent.mp3";
const SOUND_FRIEND_MESSAGE_RECEIVED = "/sounds/friend_message_received.mp3";
const SOUND_FRIEND_TYPING = "/sounds/friend_typing.mp3";
const SOUND_MY_AUDIO_RECORD_START = "/sounds/my_audio_record_start.mp3";
const SOUND_MY_AUDIO_SENT = "/sounds/my_audio_sent.mp3";
const SOUND_MY_TYPING = "/sounds/my_typing.mp3";


export default function ChatterSimPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState("");
  const [showFriendTypingIndicator, setShowFriendTypingIndicator] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showKeypadInputArea, setShowKeypadInputArea] = useState(false);
  const [showSendButton, setShowSendButton] = useState(false);
  const [customMessageQueue, setCustomMessageQueue] = useState<MessageQueueItem[]>(() => {
    return JSON.parse(JSON.stringify(defaultMessageQueue)); // Deep copy
  });

  const [friendName, setFriendName] = useState<string>("Alice");
  const [friendAvatarUrl, setFriendAvatarUrl] = useState<string>("https://placehold.co/80x80.png");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const audioCompletionPromises = useRef<Record<string, () => void>>({});
  const videoCompletionPromises = useRef<Record<string, () => void>>({});

  const playSound = (soundUrl: string) => {
    try {
      const audio = new Audio(soundUrl);
      audio.play().catch(error => console.warn(`Failed to play sound ${soundUrl}:`, error));
    } catch (error) {
      console.warn(`Error creating audio for ${soundUrl}:`, error);
    }
  };


  const addMessage = (newMessageOmitIdTimestamp: Omit<Message, "id" | "timestamp">) => {
    const newMessage = {
      ...newMessageOmitIdTimestamp,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessageTicks = (messageId: string, ticks: "sent" | "delivered") => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, ticks } : msg));
  };

  const handleAudioPlaybackEnd = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isPlaying: false } : msg));
    audioCompletionPromises.current[messageId]?.();
    delete audioCompletionPromises.current[messageId];
  }, []);

  const handleVideoPlaybackEnd = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isVideoPlaying: false } : msg));
    videoCompletionPromises.current[messageId]?.();
    delete videoCompletionPromises.current[messageId];
  }, []);

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFriendAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUploadedAvatar = () => {
    setFriendAvatarUrl("https://placehold.co/80x80.png");
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
  };

  const isAvatarUploaded = friendAvatarUrl.startsWith("data:image");


  const simulateChat = async (queue: MessageQueueItem[]) => {
    if (!queue || queue.length === 0) {
      console.warn("Message queue is empty. Nothing to simulate.");
      return;
    }
    setIsSimulating(true);
    setShowKeypadInputArea(false);
    setCurrentTypingText("");
    setIsRecordingAudio(false);
    setShowFriendTypingIndicator(false);
    setMessages([]);

    await delay(500);

    for (const item of queue) {
      if (item.sender === "me") {
        setShowKeypadInputArea(true);
        await delay(300);

        let sentMessageId: string | undefined;

        if (item.type === "text") {
          setShowSendButton(false);
          playSound(SOUND_MY_TYPING);
          for (let i = 0; i < item.content.length; i++) {
            setCurrentTypingText(item.content.substring(0, i + 1));
            await delay(TYPING_SPEED_MS);
          }
          setShowSendButton(true);
          await delay(500);

          sentMessageId = addMessage({
            sender: "me",
            type: "text",
            content: item.content,
            ticks: "sent"
          });
          playSound(SOUND_MY_MESSAGE_SENT);
          setCurrentTypingText("");
          setShowSendButton(false);

        } else if (item.type === "audio") {
          playSound(SOUND_MY_AUDIO_RECORD_START);
          setIsRecordingAudio(true);
          setCurrentTypingText("");
          setShowSendButton(false);

          if (item.content) {
            const audio = new Audio(item.content);
            const playbackPromise = new Promise<void>((resolve, reject) => {
              audio.oncanplaythrough = () => audio.play().catch(err => {
                console.error("Error playing recording sim audio:", err);
                resolve();
              });
              audio.onended = resolve;
              audio.onerror = (e) => {
                console.error("Error during recording sim audio playback:", e);
                resolve();
              };
              audio.load();
            });
            try {
              await playbackPromise;
            } catch (error) {
                console.error("Failed to play audio during 'me' sending simulation, falling back to duration:", error);
                await delay(item.audioDuration || 2000);
            }
          } else {
            await delay(item.audioDuration || 2000);
          }

          setIsRecordingAudio(false);
          sentMessageId = addMessage({
            sender: "me",
            type: "audio",
            content: item.content,
            audioDuration: item.audioDuration,
            ticks: "sent"
          });
          playSound(SOUND_MY_AUDIO_SENT);

        } else if (item.type === "image" || item.type === "gif" || item.type === "sticker" || item.type === "video") {
          setCurrentTypingText(`Sending ${item.type}...`);
          setShowSendButton(true);
          await delay(700);

          sentMessageId = addMessage({
            sender: "me",
            type: item.type,
            content: item.content,
            videoDuration: item.videoDuration,
            ticks: "sent"
          });
          playSound(SOUND_MY_MESSAGE_SENT);
          setCurrentTypingText("");
          setShowSendButton(false);
        }

        if (sentMessageId) {
          await delay(300);
          updateMessageTicks(sentMessageId, "delivered");
        }
        setShowKeypadInputArea(false);

      } else { // sender is "friend"
        setShowKeypadInputArea(false);
        setShowFriendTypingIndicator(true);
        playSound(SOUND_FRIEND_TYPING);
        await delay(FRIEND_TYPING_INDICATOR_DURATION_MS);
        setShowFriendTypingIndicator(false);

        if (item.type === "text") {
          addMessage({ sender: "friend", type: "text", content: item.content });
          playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
          const wordCount = item.content.split(/\s+/).length;
          const readingTimeMs = (wordCount / READING_WORDS_PER_MINUTE) * 60 * 1000;
          await delay(Math.max(readingTimeMs, 1000));

        } else if (item.type === "audio") {
           if (!item.content) {
            console.warn("Friend's audio message has no content. Skipping playback wait.");
            addMessage({ sender: "friend", type: "audio", content: "", isPlaying: false, audioDuration: item.audioDuration });
            playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
            await delay(item.audioDuration || 1000);
          } else {
            const audioMessageId = addMessage({
              sender: "friend",
              type: "audio",
              content: item.content,
              isPlaying: true,
              audioDuration: item.audioDuration
            });
            playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
            await new Promise<void>(resolve => {
               audioCompletionPromises.current[audioMessageId] = resolve;
            });
          }
        } else if (item.type === "video") {
          if (!item.content) {
             console.warn("Friend's video message has no content. Skipping playback wait.");
             addMessage({ sender: "friend", type: "video", content: "", isVideoPlaying: false, videoDuration: item.videoDuration });
             playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
             await delay(item.videoDuration || 2000);
          } else {
            const videoMessageId = addMessage({
              sender: "friend",
              type: "video",
              content: item.content,
              isVideoPlaying: true,
              videoDuration: item.videoDuration
            });
            playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
            await new Promise<void>(resolve => {
               videoCompletionPromises.current[videoMessageId] = resolve;
            });
          }
        } else if (item.type === "image" || item.type === "gif" || item.type === "sticker") {
           addMessage({ sender: "friend", type: item.type, content: item.content });
           playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
           await delay(1500);
        }
      }
      await delay(item.delayAfter);
    }

    setIsSimulating(false);
    setShowKeypadInputArea(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-200 dark:bg-slate-900 p-4 gap-4">
      <div className="md:w-1/3 lg:w-1/4 h-full md:max-h-[calc(100vh-2rem)] flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customize Friend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="friendName">Friend's Name</Label>
              <Input
                id="friendName"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Enter friend's name"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friendAvatarUrl">Friend's Avatar</Label>
              <div className="flex items-center gap-2">
                {friendAvatarUrl ? (
                    <Image src={friendAvatarUrl} alt="Friend Avatar Preview" width={40} height={40} className="rounded-full object-cover border" data-ai-hint="profile avatar"/>
                  ) : (
                    <UserCircle className="h-10 w-10 text-muted-foreground" />
                  )}
                <Input
                  id="friendAvatarUrl"
                  value={isAvatarUploaded ? "Using uploaded file" : friendAvatarUrl}
                  onChange={(e) => {
                    if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
                    setFriendAvatarUrl(e.target.value);
                  }}
                  placeholder="Enter avatar URL or upload"
                  className="mt-1 flex-grow"
                  disabled={isAvatarUploaded}
                />
              </div>
              <div className="text-sm text-muted-foreground text-center my-1">OR</div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="avatar-file-input" className={`w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${isAvatarUploaded ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer'}`}>
                  <FileUp className="mr-2 h-4 w-4" /> Upload Avatar
                </Label>
                <Input
                  id="avatar-file-input"
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  disabled={isAvatarUploaded}
                />
                 {isAvatarUploaded && (
                  <Button variant="outline" size="iconSm" onClick={clearUploadedAvatar} aria-label="Clear uploaded avatar">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <MessageComposer queue={customMessageQueue} setQueue={setCustomMessageQueue} />
      </div>

      <div className="md:w-2/3 lg:w-3/4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm h-[calc(100vh-2rem-env(safe-area-inset-bottom))] sm:h-[calc(100vh-4rem-env(safe-area-inset-bottom))] max-h-[800px] bg-background flex flex-col shadow-2xl rounded-xl overflow-hidden border-4 border-slate-700 dark:border-slate-600">
          <ChatHeader name={friendName} avatarUrl={friendAvatarUrl || undefined} isOnline={isSimulating || showFriendTypingIndicator} />
          <ChatWindow
            messages={messages}
            showTypingIndicator={showFriendTypingIndicator}
            onAudioPlaybackEnd={handleAudioPlaybackEnd}
            onVideoPlaybackEnd={handleVideoPlaybackEnd}
            friendAvatarUrl={friendAvatarUrl}
          />
          {(showKeypadInputArea || isRecordingAudio) && (
            <KeypadArea
              isSimulating={isSimulating && (currentTypingText !== "" || isRecordingAudio)}
              isRecordingAudio={isRecordingAudio}
              typedText={currentTypingText}
              showSendButton={showSendButton}
            />
          )}
          <div className="p-4 border-t bg-background dark:bg-primary/10">
            <Button
              onClick={() => simulateChat(customMessageQueue)}
              disabled={isSimulating || customMessageQueue.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Start chat simulation"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              {isSimulating ? "Simulating..." : "Simulate Chat"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

