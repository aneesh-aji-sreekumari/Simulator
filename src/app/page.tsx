
"use client";

import { useState, useEffect, useRef, useCallback, ChangeEvent } from "react";
import type { Message, MessageQueueItem } from "@/types/chat";
import { messageQueue as defaultMessageQueue } from "@/lib/sample-chat-data";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatWindow from "@/components/chat/ChatWindow";
import KeypadArea from "@/components/chat/KeypadArea";
import MessageComposer from "@/components/composer/MessageComposer";
import AppHeader from "@/components/layout/AppHeader";
import { UserCircle, FileUp as FileUpIcon, XCircle as XCircleIcon, Image as ImageIcon, Music2, Play, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import NextImage from "next/image";


const TYPING_SPEED_MS = 80;
const FRIEND_TYPING_INDICATOR_DURATION_MS = 1500;
const READING_WORDS_PER_MINUTE = 200;


const stoppableDelay = (ms: number, signal: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }
    const timeoutId = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
};


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
  const [showSendButton, setShowSendButton] = useState(false);
  const [customMessageQueue, setCustomMessageQueue] = useState<MessageQueueItem[]>(() => {
    return JSON.parse(JSON.stringify(defaultMessageQueue));
  });

  const [friendName, setFriendName] = useState<string>("Alice");
  const [friendAvatarUrl, setFriendAvatarUrl] = useState<string>("https://placehold.co/80x80.png");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [chatWallpaperUrl, setChatWallpaperUrl] = useState<string>("");
  const [chatWallpaperUrlInput, setChatWallpaperUrlInput] = useState<string>("");
  const [isChatWallpaperUploaded, setIsChatWallpaperUploaded] = useState<boolean>(false);
  const chatWallpaperFileInputRef = useRef<HTMLInputElement>(null);

  const simulationAbortControllerRef = useRef<AbortController | null>(null);

  const audioCompletionPromises = useRef<Record<string, () => void>>({});
  const videoCompletionPromises = useRef<Record<string, () => void>>({});

  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  const [soundEffectsVolume, setSoundEffectsVolume] = useState<number>(1);


  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
    setCurrentTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (currentTheme === undefined) {
      return; 
    }
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [currentTheme]);

  const handleThemeToggle = () => {
    setCurrentTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };


  const toggleFullScreenChat = useCallback(() => {
    setIsFullScreenChat(prev => !prev);
  }, []);

  const playSound = (soundUrl: string) => {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = soundEffectsVolume;
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
    const videoMessageId = messageId;
    videoCompletionPromises.current[videoMessageId]?.();
    delete videoCompletionPromises.current[videoMessageId];
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

  const handleChatWallpaperUrlInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setChatWallpaperUrlInput(e.target.value);
  };

  const setChatWallpaperFromUrl = () => {
    setChatWallpaperUrl(chatWallpaperUrlInput);
    setIsChatWallpaperUploaded(false);
    if (chatWallpaperFileInputRef.current) {
      chatWallpaperFileInputRef.current.value = "";
    }
  };

  const handleChatWallpaperFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatWallpaperUrl(reader.result as string);
        setIsChatWallpaperUploaded(true);
        setChatWallpaperUrlInput("");
      };
      reader.readAsDataURL(file);
    }
  };

  const clearChatWallpaper = () => {
    setChatWallpaperUrl("");
    setChatWallpaperUrlInput("");
    setIsChatWallpaperUploaded(false);
    if (chatWallpaperFileInputRef.current) {
      chatWallpaperFileInputRef.current.value = "";
    }
  };


  const simulateChat = async (queue: MessageQueueItem[]) => {
    if (!queue || queue.length === 0) {
      console.warn("Message queue is empty. Nothing to simulate.");
      return;
    }

    simulationAbortControllerRef.current = new AbortController();
    const signal = simulationAbortControllerRef.current.signal;

    setIsSimulating(true);
    setCurrentTypingText("");
    setShowSendButton(false);
    setIsRecordingAudio(false);
    setShowFriendTypingIndicator(false);
    setMessages([]);


    try {
      await stoppableDelay(500, signal);

      for (let i = 0; i < queue.length; i++) {
        if (signal.aborted) return;
        const item = queue[i];

        if (item.sender === "me") {
          await stoppableDelay(300, signal);
          if (signal.aborted) return;

          let sentMessageId: string | undefined;

          if (item.type === "text") {
            setShowSendButton(false);

            const typingLoopSound = new Audio(SOUND_MY_TYPING);
            typingLoopSound.loop = true;
            typingLoopSound.volume = soundEffectsVolume;
            let typingSoundActuallyPlayed = false;

            try {
              if (item.content.length > 0) {
                typingLoopSound.play().catch(err => console.warn("Error playing looping typing sound:", err));
                typingSoundActuallyPlayed = true;
              }

              for (let charIndex = 0; charIndex < item.content.length; charIndex++) {
                setCurrentTypingText(item.content.substring(0, charIndex + 1));
                await stoppableDelay(TYPING_SPEED_MS, signal);
              }
            } finally {
              if (typingSoundActuallyPlayed) {
                typingLoopSound.pause();
              }
            }

            if (signal.aborted) return;

            setShowSendButton(true);
            await stoppableDelay(500, signal);
            if (signal.aborted) return;

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
              audio.volume = soundEffectsVolume; 
              const playbackPromise = new Promise<void>((resolvePlayback, rejectPlayback) => {
                if (signal.aborted) return rejectPlayback(new DOMException("Aborted", "AbortError"));
                const onAbort = () => {
                    audio.pause();
                    rejectPlayback(new DOMException("Aborted", "AbortError"));
                };
                signal.addEventListener('abort', onAbort, { once: true });

                audio.oncanplaythrough = () => audio.play().catch(err => {
                  console.error("Error playing my recording sim audio:", err);
                  signal.removeEventListener('abort', onAbort);
                  resolvePlayback();
                });
                audio.onended = () => {
                    signal.removeEventListener('abort', onAbort);
                    resolvePlayback();
                };
                audio.onerror = (e) => {
                  console.error("Error during my recording sim audio playback:", e);
                  signal.removeEventListener('abort', onAbort);
                  resolvePlayback();
                };
                audio.load();
              });
              await playbackPromise;
            } else {
              await stoppableDelay(item.audioDuration || 2000, signal);
            }
            if (signal.aborted) return;

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
            await stoppableDelay(700, signal);
            if (signal.aborted) return;

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
            await stoppableDelay(300, signal);
            if (signal.aborted) return;
            updateMessageTicks(sentMessageId, "delivered");
          }

        } else { // Friend's message
          setCurrentTypingText("");
          setShowSendButton(false);
          setIsRecordingAudio(false);

          setShowFriendTypingIndicator(true);
          playSound(SOUND_FRIEND_TYPING);
          await stoppableDelay(FRIEND_TYPING_INDICATOR_DURATION_MS, signal);
          if (signal.aborted) return;
          setShowFriendTypingIndicator(false);


          if (item.type === "text") {
            addMessage({ sender: "friend", type: "text", content: item.content });
            playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
            const wordCount = item.content.split(/\s+/).length;
            const readingTimeMs = (wordCount / READING_WORDS_PER_MINUTE) * 60 * 1000;
            await stoppableDelay(Math.max(readingTimeMs, 1000), signal);

          } else if (item.type === "audio") {
            if (!item.content) {
              console.warn("Friend's audio message has no content. Skipping playback wait.");
              addMessage({ sender: "friend", type: "audio", content: "", isPlaying: false, audioDuration: item.audioDuration });
              playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
              await stoppableDelay(item.audioDuration || 1000, signal);
            } else {
              const audioMessageId = addMessage({
                sender: "friend",
                type: "audio",
                content: item.content,
                isPlaying: true,
                audioDuration: item.audioDuration
              });
              playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
              try {
                await new Promise<void>((resolvePlayback, rejectPlayback) => {
                   if (signal.aborted) return rejectPlayback(new DOMException("Aborted", "AbortError"));
                   const onAbort = () => {
                      const audioToStop = document.getElementById(`audio-${audioMessageId}`) as HTMLAudioElement;
                      if(audioToStop) audioToStop.pause();
                      rejectPlayback(new DOMException("Aborted", "AbortError"));
                   };
                   signal.addEventListener('abort', onAbort, { once: true });
                   audioCompletionPromises.current[audioMessageId] = () => {
                      signal.removeEventListener('abort', onAbort);
                      resolvePlayback();
                   };
                });
              } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) throw e; }
            }
          } else if (item.type === "video") {
            if (!item.content) {
               console.warn("Friend's video message has no content. Skipping playback wait.");
               addMessage({ sender: "friend", type: "video", content: "", isVideoPlaying: false, videoDuration: item.videoDuration });
               playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
               await stoppableDelay(item.videoDuration || 2000, signal);
            } else {
              const videoMessageId = addMessage({
                sender: "friend",
                type: "video",
                content: item.content,
                isVideoPlaying: true,
                videoDuration: item.videoDuration
              });
              playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
              try {
                await new Promise<void>((resolvePlayback, rejectPlayback) => {
                   if (signal.aborted) return rejectPlayback(new DOMException("Aborted", "AbortError"));
                   const onAbort = () => {
                      const videoToStop = document.getElementById(`video-${videoMessageId}`) as HTMLVideoElement;
                      if(videoToStop) videoToStop.pause();
                      rejectPlayback(new DOMException("Aborted", "AbortError"));
                   };
                   signal.addEventListener('abort', onAbort, { once: true });
                   videoCompletionPromises.current[videoMessageId] = () => {
                      signal.removeEventListener('abort', onAbort);
                      resolvePlayback();
                   };
                });
              } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) throw e; }
            }
          } else if (item.type === "image" || item.type === "gif" || item.type === "sticker") {
             addMessage({ sender: "friend", type: item.type, content: item.content });
             playSound(SOUND_FRIEND_MESSAGE_RECEIVED);
             await stoppableDelay(1500, signal);
          }
        }

        if (signal.aborted) return;
        await stoppableDelay(item.delayAfter, signal);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Simulation was aborted by user.");
      } else {
        console.error("Error during simulation:", error);
      }
    } finally {
      setIsSimulating(false);
      setCurrentTypingText("");
      setShowSendButton(false);
      setIsRecordingAudio(false);
      setShowFriendTypingIndicator(false);
      simulationAbortControllerRef.current = null;
    }
  };

  const handleStartSimulation = () => {
    simulateChat(customMessageQueue);
  };

  const handleStopSimulation = () => {
    if (simulationAbortControllerRef.current) {
      simulationAbortControllerRef.current.abort();
    }
  };

  const handleResetSimulation = () => {
    if (simulationAbortControllerRef.current) {
      simulationAbortControllerRef.current.abort();
    }
    setMessages([]);
    setCurrentTypingText("");
    setShowFriendTypingIndicator(false);
    setIsRecordingAudio(false);
    setShowSendButton(false);
    setIsSimulating(false);
  };


  const chatWindowHeight = "h-[calc(100vh-var(--app-header-height)-var(--app-main-padding-y))]";
  const fullScreenChatWindowHeight = "h-[calc(100vh-var(--app-header-height)-var(--app-main-padding-y))]";

  const appHeaderHeight = "60px";
  const appMainPaddingY = "32px";

  const dynamicStyles = {
    "--app-header-height": appHeaderHeight,
    "--app-main-padding-y": appMainPaddingY,
  } as React.CSSProperties;


  return (
    <div className="flex flex-col min-h-screen bg-slate-200 dark:bg-slate-900" style={dynamicStyles}>
      <AppHeader
        isFullScreenChat={isFullScreenChat}
        onToggleFullScreen={toggleFullScreenChat}
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        onResetSimulation={handleResetSimulation}
        isSimulating={isSimulating}
        canSimulate={customMessageQueue.length > 0}
        currentTheme={currentTheme || 'light'}
        onToggleTheme={handleThemeToggle}
      />

      <main className={`flex-grow flex p-4 gap-4 ${isFullScreenChat ? 'justify-center items-start' : 'flex-col md:flex-row'}`}>
        {!isFullScreenChat && (
          <div className="md:w-1/3 lg:w-1/4 h-full md:max-h-[calc(100vh-var(--app-header-height)-var(--app-main-padding-y))] flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customize Chat</CardTitle>
                <CardDescription>Set name, avatar, wallpaper, and sound volume.</CardDescription>
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
                        <NextImage src={friendAvatarUrl} alt="Friend Avatar Preview" width={40} height={40} className="rounded-full object-cover border" data-ai-hint="profile avatar"/>
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
                      <FileUpIcon className="mr-2 h-4 w-4" /> Upload Avatar
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
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="chatWallpaperUrlInput">Chat Wallpaper</Label>
                  <div className="flex items-center gap-2">
                     {chatWallpaperUrl && (
                       <NextImage src={chatWallpaperUrl} alt="Wallpaper Preview" width={40} height={40} className="rounded object-cover border" data-ai-hint="wallpaper background"/>
                     )}
                    <Input
                      id="chatWallpaperUrlInput"
                      value={isChatWallpaperUploaded ? "Using uploaded file" : chatWallpaperUrlInput}
                      onChange={handleChatWallpaperUrlInputChange}
                      placeholder="Enter wallpaper URL"
                      className="mt-1 flex-grow"
                      disabled={isChatWallpaperUploaded}
                    />
                    {!isChatWallpaperUploaded && (
                        <Button variant="outline" size="sm" onClick={setChatWallpaperFromUrl} disabled={!chatWallpaperUrlInput}>Set URL</Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground text-center my-1">OR</div>
                   <div className="flex gap-2 items-center">
                    <Label htmlFor="wallpaper-file-input" className={`w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${isChatWallpaperUploaded ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer'}`}>
                      <ImageIcon className="mr-2 h-4 w-4" /> Upload Wallpaper
                    </Label>
                    <Input
                      id="wallpaper-file-input"
                      ref={chatWallpaperFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChatWallpaperFileChange}
                      className="hidden"
                      disabled={isChatWallpaperUploaded}
                    />
                     {chatWallpaperUrl && (
                      <Button variant="outline" size="iconSm" onClick={clearChatWallpaper} aria-label="Clear chat wallpaper">
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 border-t pt-4">
                  <Label htmlFor="soundEffectsVolume">Sound Effects Volume ({Math.round(soundEffectsVolume * 100)}%)</Label>
                  <Slider
                    id="soundEffectsVolume"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[soundEffectsVolume]}
                    onValueChange={(value) => setSoundEffectsVolume(value[0])}
                    aria-label="Sound effects volume"
                  />
                </div>
              </CardContent>
            </Card>

            <MessageComposer queue={customMessageQueue} setQueue={setCustomMessageQueue} />
          </div>
        )}

        <div className={`flex flex-col items-center justify-start ${isFullScreenChat ? 'w-full max-w-xl' : 'flex-grow md:w-2/3 lg:w-3/4'}`}>
            <div
              className={`flex flex-col shadow-2xl overflow-hidden rounded-xl border-4 border-slate-700 dark:border-slate-600 ${isFullScreenChat ? `w-full ${fullScreenChatWindowHeight}` : `w-full max-w-sm ${chatWindowHeight} max-h-[750px]`} bg-background`}
            >
              <ChatHeader
                name={friendName}
                avatarUrl={friendAvatarUrl || undefined}
                isOnline={isSimulating || showFriendTypingIndicator}
              />
              <ChatWindow
                messages={messages}
                showTypingIndicator={showFriendTypingIndicator}
                onAudioPlaybackEnd={handleAudioPlaybackEnd}
                onVideoPlaybackEnd={handleVideoPlaybackEnd}
                friendAvatarUrl={friendAvatarUrl}
                wallpaperUrl={chatWallpaperUrl}
              />
              <KeypadArea
                isSimulating={isSimulating && (currentTypingText !== "" || isRecordingAudio)}
                isRecordingAudio={isRecordingAudio}
                typedText={currentTypingText}
                showSendButton={showSendButton}
              />
            </div>
        </div>
      </main>
    </div>
  );
}

