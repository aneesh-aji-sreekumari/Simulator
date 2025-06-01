
"use client";

import type { MessageQueueItem, MessageSender, MessageType } from "@/types/chat";
import { useState, useRef, type ChangeEvent, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XCircle, Edit3, Trash2, PlusCircle, FileUp, FileSpreadsheet } from "lucide-react";
import NextImage from "next/image";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MessageComposerProps {
  queue: MessageQueueItem[];
  setQueue: (newQueue: MessageQueueItem[]) => void;
}

const initialFormState: Omit<MessageQueueItem, "id"> = {
  sender: "me" as MessageSender,
  type: "text" as MessageType,
  content: "",
  delayAfter: 1000,
  audioDuration: undefined,
  videoDuration: undefined,
};

const VALID_MESSAGE_TYPES: MessageType[] = ["text", "audio", "image", "gif", "sticker", "video"];
const VALID_SENDERS: MessageSender[] = ["me", "friend"];

export default function MessageComposer({ queue, setQueue }: MessageComposerProps) {
  const [formData, setFormData] = useState<Omit<MessageQueueItem, "id">>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  useEffect(() => {
    if (!isDialogOpen) {
      resetForm();
    }
  }, [isDialogOpen]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "content" && formData.type !== "text") {
      setFormData(prev => ({
        ...prev,
        content: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (name === "delayAfter" || name === "audioDuration" || name === "videoDuration")
                  ? parseInt(value, 10) || 0
                  : value
      }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          content: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        content: prev.content.startsWith("data:") ? "" : prev.content,
      }));
    }
  };

  const handleSelectChange = (name: "sender" | "type") => (value: string) => {
    const newType = value as MessageType;

    setFormData(prev => {
      let newContent = prev.content;

      if (name === 'type' && prev.content.startsWith("data:")) {
        newContent = "";
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      const activeType = name === 'type' ? newType : prev.type;
      return {
        ...prev,
        [name]: value,
        content: newContent,
        audioDuration: activeType === "audio" ? prev.audioDuration || 2000 : undefined,
        videoDuration: activeType === "video" ? prev.videoDuration || 5000 : undefined,
      };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.content && (formData.type !== 'text' && !formData.audioDuration && !formData.videoDuration )) {
        if (formData.type === 'audio' && !formData.audioDuration && !formData.content) {
          toast({ title: "Validation Error", description: "Content URL/DataURI or duration is required for audio message type.", variant: "destructive" });
          return;
        }
        if (formData.type === 'video' && !formData.videoDuration && !formData.content) {
          toast({ title: "Validation Error", description: "Content URL/DataURI or duration is required for video message type.", variant: "destructive" });
          return;
        }
        if (formData.type !== 'text' && formData.type !== 'audio' && formData.type !== 'video' && !formData.content) {
          toast({ title: "Validation Error", description: `Content URL/DataURI is required for message type: ${formData.type}.`, variant: "destructive" });
          return;
        }
    }

    if (dialogMode === 'edit' && editingId) {
      setQueue(queue.map(item => item.id === editingId ? { ...formData, id: editingId } : item));
      toast({ title: "Message Updated", description: "The message has been updated in the queue." });
    } else {
      const newItemId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      setQueue([...queue, { ...formData, id: newItemId }]);
      toast({ title: "Message Added", description: "The new message has been added to the queue." });
    }
    setIsDialogOpen(false);
  };

  const handleAddNewClick = () => {
    resetForm();
    setDialogMode("add");
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (messageToEdit: MessageQueueItem) => {
    setFormData({
      sender: messageToEdit.sender,
      type: messageToEdit.type,
      content: messageToEdit.content,
      delayAfter: messageToEdit.delayAfter,
      audioDuration: messageToEdit.audioDuration,
      videoDuration: messageToEdit.videoDuration,
    });
    setEditingId(messageToEdit.id);
    setDialogMode("edit");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (idToDelete: string) => {
    setQueue(queue.filter(item => item.id !== idToDelete));
    if (editingId === idToDelete) {
      resetForm();
      setIsDialogOpen(false);
    }
    toast({ title: "Message Deleted", description: "The message has been removed from the queue." });
  };

  const handleClearQueue = () => {
    setQueue([]);
    resetForm();
    setIsDialogOpen(false);
    toast({ title: "Queue Cleared", description: "All messages have been removed from the queue." });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearUploadedFile = () => {
    setFormData(prev => ({...prev, content: ''}));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExcelImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          toast({ title: "Import Error", description: "Could not read file data.", variant: "destructive" });
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newQueue: MessageQueueItem[] = [];
        const errors: string[] = [];

        json.forEach((row, index) => {
          const sender = row.sender?.toString().toLowerCase() as MessageSender;
          const type = row.type?.toString().toLowerCase() as MessageType;
          const content = row.content?.toString() || "";
          const delayAfter = parseInt(row.delayAfter, 10);
          const audioDuration = row.audioDuration ? parseInt(row.audioDuration, 10) : undefined;
          const videoDuration = row.videoDuration ? parseInt(row.videoDuration, 10) : undefined;

          let rowIsValid = true;
          if (!VALID_SENDERS.includes(sender)) { errors.push(`Row ${index + 2}: Invalid sender '${row.sender}'.`); rowIsValid = false; }
          if (!VALID_MESSAGE_TYPES.includes(type)) { errors.push(`Row ${index + 2}: Invalid type '${row.type}'.`); rowIsValid = false; }
          if (!content && !(type === 'audio' && audioDuration) && !(type === 'video' && videoDuration)) { errors.push(`Row ${index + 2}: Content is required for type '${type}'.`); rowIsValid = false; }
          if (isNaN(delayAfter) || delayAfter < 0) { errors.push(`Row ${index + 2}: Invalid 'delayAfter'.`); rowIsValid = false; }
          if (type === 'audio' && audioDuration !== undefined && (isNaN(audioDuration) || audioDuration < 0)) { errors.push(`Row ${index + 2}: Invalid 'audioDuration'.`); rowIsValid = false; }
          if (type === 'video' && videoDuration !== undefined && (isNaN(videoDuration) || videoDuration < 0)) { errors.push(`Row ${index + 2}: Invalid 'videoDuration'.`); rowIsValid = false; }
          if (type !== 'text' && !content.match(/^(data:|https?:\/\/)/i) && !(type === 'audio' && audioDuration && !content) && !(type === 'video' && videoDuration && !content) ) { errors.push(`Row ${index + 2}: Content for media type '${type}' must be a URL/Data URI.`); rowIsValid = false; }


          if (rowIsValid) {
            newQueue.push({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 7) + index,
              sender, type, content, delayAfter,
              audioDuration: type === 'audio' ? audioDuration : undefined,
              videoDuration: type === 'video' ? videoDuration : undefined,
            });
          }
        });

        if (errors.length > 0) {
          toast({
            title: "Import Failed with Errors",
            description: <ScrollArea className="h-20"><ul className="list-disc pl-5">{errors.map((err, i) => <li key={i}>{err}</li>)}</ul></ScrollArea>,
            variant: "destructive", duration: 10000,
          });
        } else if (newQueue.length === 0 && json.length > 0) {
            toast({ title: "Import Warning", description: "No valid messages found.", variant: "default" });
        } else if (newQueue.length > 0) {
          setQueue(newQueue);
          toast({ title: "Import Successful", description: `${newQueue.length} messages imported.` });
        } else {
          toast({ title: "Import Info", description: "Excel file was empty or no valid data.", variant: "default" });
        }
      } catch (error) {
        console.error("Error importing Excel file:", error);
        toast({ title: "Import Error", description: "Failed to process Excel. Check format.", variant: "destructive" });
      } finally {
        if (excelFileInputRef.current) excelFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const isMediaUploaded = formData.content.startsWith("data:");

  const getItemSummary = (item: MessageQueueItem) => {
    let summary = `[${item.sender === 'me' ? 'Me' : 'Friend'}] ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}: `;
    if (item.type === 'text') {
      summary += `"${item.content.substring(0, 30)}${item.content.length > 30 ? '...' : ''}"`;
    } else if (item.content.startsWith("data:")) {
      summary += `[Uploaded ${item.type}]`;
    } else if (item.content) {
      summary += `[${item.type} URL]`;
    } else if (item.type === 'audio' && item.audioDuration) {
      summary += `[Audio - ${item.audioDuration}ms]`;
    } else if (item.type === 'video' && item.videoDuration) {
      summary += `[Video - ${item.videoDuration}ms]`;
    } else {
      summary += `[${item.type}]`;
    }
    summary += ` (Delay: ${item.delayAfter}ms)`;
    return summary;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle>Message Queue Composer</CardTitle>
          <CardDescription>Create, manage, or import the sequence of messages.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleAddNewClick} className="flex-shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Message
            </Button>
            <Label htmlFor="excel-file-input" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer flex-shrink-0">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Queue
            </Label>
            <Input id="excel-file-input" ref={excelFileInputRef} type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
            {queue.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClearQueue} className="flex-shrink-0">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All ({queue.length})
              </Button>
            )}
          </div>

          <div className="flex-grow flex flex-col overflow-hidden">
            {queue.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">The message queue is empty.</p>
            ) : (
              <ScrollArea className="flex-grow border rounded-md">
                <Accordion type="multiple" className="w-full p-1">
                  {queue.map((item) => (
                    <AccordionItem value={item.id} key={item.id} className="border-b">
                      <AccordionTrigger className="hover:no-underline text-sm p-3 w-full text-left">
                        <span className="whitespace-normal break-words w-full pr-2">{getItemSummary(item)}</span>
                      </AccordionTrigger>
                      <AccordionContent className="p-3 space-y-3">
                        <div className="space-y-1 text-sm">
                          <p><span className="font-semibold">Sender:</span> <span className={`capitalize px-1.5 py-0.5 rounded-full text-xs ${item.sender === 'me' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>{item.sender}</span></p>
                          <p><span className="font-semibold">Type:</span> <span className="capitalize">{item.type}</span></p>
                          <p className="whitespace-normal break-words"><span className="font-semibold">Content:</span> {item.content.startsWith("data:") ? `[Uploaded ${item.type}]` : item.content}</p>
                          <p><span className="font-semibold">Delay After:</span> {item.delayAfter}ms</p>
                          {item.type === 'audio' && typeof item.audioDuration === 'number' && <p><span className="font-semibold">Audio Duration:</span> {item.audioDuration}ms</p>}
                          {item.type === 'video' && typeof item.videoDuration === 'number' && <p><span className="font-semibold">Video Duration:</span> {item.videoDuration}ms</p>}
                        </div>
                        <div className="flex gap-2 mt-2">
                           <Button variant="outline" size="sm" onClick={() => handleEditClick(item)} aria-label="Edit message">
                              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                           </Button>
                           <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} aria-label="Delete message">
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                           </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogMode === "add" ? "Add New Message" : "Edit Message"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="sender-dialog">Sender</Label>
            <Select name="sender" value={formData.sender} onValueChange={handleSelectChange("sender")}>
              <SelectTrigger id="sender-dialog"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="me">Me</SelectItem><SelectItem value="friend">Friend</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="type-dialog">Type</Label>
            <Select name="type" value={formData.type} onValueChange={handleSelectChange("type")}>
              <SelectTrigger id="type-dialog"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem><SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="image">Image</SelectItem><SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="sticker">Sticker</SelectItem><SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="content-dialog">Content</Label>
            {formData.type === "text" ? (
              <Textarea id="content-dialog" name="content" value={formData.content} onChange={handleInputChange} placeholder="Enter message text..." />
            ) : (
              <div className="space-y-2">
                <Input id="content-dialog" name="content" value={isMediaUploaded ? "Using uploaded file" : formData.content} onChange={handleInputChange} placeholder={`Enter ${formData.type} URL or Data URI...`} disabled={isMediaUploaded} />
                <div className="text-sm text-muted-foreground text-center my-1">OR</div>
                <Label htmlFor="content-file-input-dialog" className={`w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${isMediaUploaded ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer'}`}>
                  <FileUp className="mr-2 h-4 w-4" /> Upload File
                </Label>
                <Input id="content-file-input-dialog" ref={fileInputRef} type="file"
                  accept={formData.type === "audio" ? "audio/*" : formData.type === "video" ? "video/*" : formData.type === "image" ? "image/*" : formData.type === "gif" ? "image/gif" : formData.type === "sticker" ? "image/*" : undefined}
                  onChange={handleFileChange} className="hidden" disabled={isMediaUploaded}
                />
                {isMediaUploaded && formData.content && (
                  <div className="mt-2 p-2 border rounded-md space-y-2">
                    <Label className="text-xs font-medium">Uploaded File Preview:</Label>
                    {formData.type.match(/^(image|gif|sticker)$/) && <NextImage src={formData.content} alt="Preview" width={150} height={100} className="max-w-full h-auto rounded border object-contain" data-ai-hint="media preview" />}
                    {formData.type === 'video' && <video src={formData.content} controls className="max-w-full h-auto max-h-32 rounded border" />}
                    {formData.type === 'audio' && <audio src={formData.content} controls className="w-full" />}
                    <Button variant="outline" size="sm" onClick={clearUploadedFile} className="w-full mt-1">
                      <XCircle className="mr-2 h-4 w-4" /> Clear Uploaded File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          {formData.type === "audio" && (
            <div><Label htmlFor="audioDuration-dialog">Audio Duration (ms)</Label><Input id="audioDuration-dialog" name="audioDuration" type="number" value={formData.audioDuration || ""} onChange={handleInputChange} placeholder="e.g., 2000" /></div>
          )}
          {formData.type === "video" && (
            <div><Label htmlFor="videoDuration-dialog">Video Duration (ms)</Label><Input id="videoDuration-dialog" name="videoDuration" type="number" value={formData.videoDuration || ""} onChange={handleInputChange} placeholder="e.g., 5000" /></div>
          )}
          <div><Label htmlFor="delayAfter-dialog">Delay After Message (ms)</Label><Input id="delayAfter-dialog" name="delayAfter" type="number" value={formData.delayAfter} onChange={handleInputChange} placeholder="e.g., 1000" /></div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit">{dialogMode === "add" ? "Add Message" : "Update Message"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    