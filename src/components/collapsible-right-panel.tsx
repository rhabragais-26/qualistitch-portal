'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { PlusCircle, Trash2, X, Edit, Save, Clock, Bell } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { toTitleCase } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';


type Panel = {
  id: string;
  title: string;
  type: 'jo-notes' | 'textarea';
};

type Note = {
  id: string;
  content: string;
  timestamp: string;
};

type Lead = {
    id: string;
    joNumber?: number;
    customerName: string;
    companyName?: string;
    contactNumber: string;
    landlineNumber?: string;
};

type Notification = {
  id: string; // noteId, unique
  leadId: string;
  customerName: string;
  joNumber: string;
  noteContent: string;
  notifyAt: string; // ISO string
  isRead: boolean;
};

function JoNotesPanel() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [currentNote, setCurrentNote] = useState('');
    const [allNotes, setAllNotes] = useState<Record<string, { lead: Lead; notes: Note[] }>>({});
    const [suggestions, setSuggestions] = useState<Lead[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
    const [deletingNote, setDeletingNote] = useState<{ leadId: string; noteId: string } | null>(null);
    const [notificationPopover, setNotificationPopover] = useState<{ noteId: string; noteContent: string, lead: Lead } | null>(null);
    const [notificationDateTime, setNotificationDateTime] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const loadNotifications = () => {
            try {
                const stored = localStorage.getItem('jo-notifications');
                if (stored) {
                    setNotifications(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to parse notifications from localStorage", e);
                setNotifications([]);
            }
        };

        loadNotifications();
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'jo-notifications') {
                loadNotifications();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
    const { data: allLeads } = useCollection<Lead>(leadsQuery);

    const getContactDisplay = (lead: Lead) => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
        if (mobile && landline) return `${mobile} / ${landline}`;
        return mobile || landline || '';
    };

    const formatJoNumber = (joNumber: number | undefined) => {
        if (!joNumber) return 'No J.O. yet';
        const currentYear = new Date().getFullYear().toString().slice(-2);
        return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
    };

    const loadNotes = useCallback(() => {
        if (allLeads) {
            const notesData: Record<string, { lead: Lead; notes: Note[] }> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('notes_')) {
                    const leadId = key.substring(6);
                    const lead = allLeads.find(l => l.id === leadId);
                    if (lead) {
                        const savedNotes = localStorage.getItem(key);
                        if (savedNotes) {
                            try {
                                const parsedNotes = JSON.parse(savedNotes);
                                if (Array.isArray(parsedNotes)) {
                                    notesData[leadId] = { lead, notes: parsedNotes };
                                }
                            } catch (e) {
                                console.error(`Could not parse notes for ${key}`, e);
                            }
                        }
                    }
                }
            }

            const sortedLeadIds = Object.keys(notesData).sort((a, b) => {
                const lastNoteA = notesData[a].notes[notesData[a].notes.length - 1];
                const lastNoteB = notesData[b].notes[notesData[b].notes.length - 1];
                const timeA = lastNoteA ? new Date(lastNoteA.timestamp).getTime() : 0;
                const timeB = lastNoteB ? new Date(lastNoteB.timestamp).getTime() : 0;
                return timeB - timeA;
            });
            
            const sortedNotesData: Record<string, { lead: Lead; notes: Note[] }> = {};
            sortedLeadIds.forEach(id => {
                sortedNotesData[id] = notesData[id];
            });

            setAllNotes(sortedNotesData);
        }
    }, [allLeads]);

    useEffect(() => {
        loadNotes();
    }, [allLeads, loadNotes]);

    const handleSaveNote = () => {
        if (!selectedLead || !currentNote.trim()) return;
        const newNote: Note = { id: new Date().toISOString(), content: currentNote, timestamp: new Date().toISOString() };
        
        const leadId = selectedLead.id;
        const existingEntry = allNotes[leadId] || { lead: selectedLead, notes: [] };
        const updatedNotes = [...existingEntry.notes, newNote];
        
        localStorage.setItem(`notes_${leadId}`, JSON.stringify(updatedNotes));
        
        loadNotes();
        setCurrentNote('');
        setSelectedLead(null);
        setSearchTerm('');
    };

    const handleDeleteNote = (leadId: string, noteId: string) => {
        const leadEntry = allNotes[leadId];
        if (!leadEntry) return;
        
        const updatedNotes = leadEntry.notes.filter(n => n.id !== noteId);
        
        if (updatedNotes.length === 0) {
            localStorage.removeItem(`notes_${leadId}`);
        } else {
            localStorage.setItem(`notes_${leadId}`, JSON.stringify(updatedNotes));
        }

        const currentNotifications = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
        const newNotifications = currentNotifications.filter((n: Notification) => n.id !== noteId);
        localStorage.setItem('jo-notifications', JSON.stringify(newNotifications));
        setNotifications(newNotifications);

        loadNotes();
    };

    const handleConfirmDeleteNote = () => {
        if (deletingNote) {
            handleDeleteNote(deletingNote.leadId, deletingNote.noteId);
            setDeletingNote(null);
        }
    };
    
    const handleDeleteAllNotes = () => {
        if (!deletingLeadId) return;
        localStorage.removeItem(`notes_${deletingLeadId}`);
        loadNotes();
        setDeletingLeadId(null);
    };

    const handleSetNotification = () => {
        if (!notificationPopover || !notificationDateTime) {
            toast({ variant: 'destructive', title: 'Please select a date and time.' });
            return;
        }

        const notifyAt = new Date(notificationDateTime);

        if (notifyAt < new Date()) {
            toast({ variant: 'destructive', title: 'Cannot set notification in the past.' });
            return;
        }

        const newNotification: Notification = {
            id: notificationPopover.noteId,
            leadId: notificationPopover.lead.id,
            customerName: notificationPopover.lead.customerName,
            joNumber: formatJoNumber(notificationPopover.lead.joNumber),
            noteContent: notificationPopover.noteContent,
            notifyAt: notifyAt.toISOString(),
            isRead: false,
        };

        const updatedNotifications = [...notifications];
        const existingIndex = updatedNotifications.findIndex(n => n.id === newNotification.id);
        if (existingIndex > -1) {
            updatedNotifications[existingIndex] = newNotification;
        } else {
            updatedNotifications.push(newNotification);
        }
        
        localStorage.setItem('jo-notifications', JSON.stringify(updatedNotifications));
        setNotifications(updatedNotifications);
        
        toast({ title: 'Notification Set!', description: `You will be notified on ${format(notifyAt, 'MMM dd, yyyy @ h:mm a')}` });
        
        setNotificationPopover(null);
        setNotificationDateTime('');
    };

    const filteredNotes = useMemo(() => {
        if (!searchTerm && !selectedLead) return allNotes;
        if (selectedLead) {
            return { [selectedLead.id]: allNotes[selectedLead.id] || { lead: selectedLead, notes: [] } };
        }
        
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        
        const filtered: Record<string, { lead: Lead; notes: Note[] }> = {};

        for (const leadId in allNotes) {
            const { lead, notes } = allNotes[leadId];
            const matchesLead = 
                (lead.joNumber && formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedSearchTerm)) ||
                lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
                (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm));

            const matchesNotes = notes.some(note => note.content.toLowerCase().includes(lowercasedSearchTerm));

            if (matchesLead || matchesNotes) {
                filtered[leadId] = allNotes[leadId];
            }
        }
        return filtered;
    }, [allNotes, searchTerm, selectedLead]);

    useEffect(() => {
        if (!searchTerm || !allLeads || !showSuggestions || selectedLead) {
            setSuggestions([]);
            return;
        }
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        
        const matchingLeads = allLeads.filter(lead => 
            (lead.joNumber && formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedSearchTerm)) ||
            lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
            (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm))
        ).slice(0, 5);

        setSuggestions(matchingLeads);

    }, [searchTerm, allLeads, showSuggestions, selectedLead]);

    const handleSuggestionClick = (lead: Lead) => {
        setSelectedLead(lead);
        setSearchTerm(lead.joNumber ? formatJoNumber(lead.joNumber) : toTitleCase(lead.customerName));
        setShowSuggestions(false);
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="relative p-2">
                <Input 
                    placeholder="Search notes, or find lead to add note..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if(selectedLead) setSelectedLead(null);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="h-9"
                />
                {showSuggestions && suggestions.length > 0 && (
                    <Card className="absolute z-10 w-[calc(100%-1rem)] mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <CardHeader className="p-2 text-xs font-bold text-muted-foreground">Select a lead to add notes</CardHeader>
                        <CardContent className="p-0">
                            {suggestions.map((lead) => (
                                <div key={lead.id} className="p-2 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => handleSuggestionClick(lead)}>
                                    <p className="font-semibold">{toTitleCase(lead.customerName)}</p>
                                    <p className="text-xs text-gray-500">{lead.joNumber ? formatJoNumber(lead.joNumber) : (lead.companyName || '')}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
            
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-4">
                    {Object.keys(filteredNotes).length > 0 ? (
                        Object.entries(filteredNotes).map(([leadId, { lead, notes }]) => (
                            <div key={leadId} className="relative p-3 border rounded-lg bg-gray-50 text-xs">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-sm">
                                            {toTitleCase(lead.customerName)}{' '}
                                            <span className="text-gray-600 font-normal">
                                                ({formatJoNumber(lead.joNumber)})
                                            </span>
                                        </p>
                                        <p className="text-gray-500">{getContactDisplay(lead)}</p>
                                    </div>
                                    <div className="absolute top-1 right-1 flex items-center">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setSelectedLead(lead); setCurrentNote(''); }}>
                                                        <PlusCircle className="h-5 w-5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Add note to this lead</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingLeadId(leadId)}>
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Delete all notes for this lead</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                                <div className="mt-2 space-y-2 pl-4 border-l-2 ml-1">
                                    {notes.map(note => {
                                        const notificationForThisNote = notifications.find(n => n.id === note.id);
                                        return (
                                        <div key={note.id} className="group relative py-2 pr-24 pl-2 text-sm">
                                            <p className="whitespace-pre-wrap">{note.content}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(note.timestamp).toLocaleString()}</p>
                                            <div className="absolute top-1 right-1 flex flex-col items-end gap-1">
                                                <div className="flex items-center">
                                                    <Popover open={notificationPopover?.noteId === note.id} onOpenChange={(isOpen) => {
                                                        if (isOpen) {
                                                            setNotificationPopover({ noteId: note.id, noteContent: note.content, lead });
                                                            const tomorrow = new Date();
                                                            tomorrow.setDate(tomorrow.getDate() + 1);
                                                            tomorrow.setHours(9, 0, 0, 0);
                                                            const yyyy = tomorrow.getFullYear();
                                                            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                                                            const dd = String(tomorrow.getDate()).padStart(2, '0');
                                                            const hh = String(tomorrow.getHours()).padStart(2, '0');
                                                            const min = String(tomorrow.getMinutes()).padStart(2, '0');
                                                            setNotificationDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                                                        } else {
                                                            setNotificationPopover(null);
                                                        }
                                                    }}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:bg-gray-200">
                                                                <Clock className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="notification-datetime">Set Notification Time</Label>
                                                                <Input
                                                                    id="notification-datetime"
                                                                    type="datetime-local"
                                                                    value={notificationDateTime}
                                                                    onChange={(e) => setNotificationDateTime(e.target.value)}
                                                                />
                                                                <Button onClick={handleSetNotification} className="w-full">Select</Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingNote({ leadId, noteId: note.id })}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {notificationForThisNote && (
                                                    <div className="flex items-center text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                                        <Bell className="h-3 w-3 mr-1" />
                                                        <span>{format(new Date(notificationForThisNote.notifyAt), 'MMM dd, h:mm a')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                           {searchTerm ? `No notes match "${searchTerm}".` : "No notes yet. Use the search bar above to find a lead and add a note."}
                        </div>
                    )}
                </div>
            </ScrollArea>
            
            {selectedLead && (
                <div className="p-2 mt-auto border-t animate-in slide-in-from-bottom-2 bg-white">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-medium">Adding note for: <span className="font-bold">{toTitleCase(selectedLead.customerName)}</span> ({selectedLead.joNumber ? formatJoNumber(selectedLead.joNumber) : 'No J.O. yet'})</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedLead(null); setSearchTerm(''); }}><X className="h-4 w-4"/></Button>
                    </div>
                    <Textarea 
                        placeholder="Type your new note here..."
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        className="min-h-[60px]"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button onClick={handleSaveNote} disabled={!currentNote.trim()} size="sm">Save Note</Button>
                    </div>
                </div>
            )}
             <AlertDialog open={!!deletingLeadId} onOpenChange={(isOpen) => !isOpen && setDeletingLeadId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all notes for this job order. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllNotes} className="bg-destructive hover:bg-destructive/90">
                            Delete All Notes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!deletingNote} onOpenChange={(isOpen) => !isOpen && setDeletingNote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this note. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteNote} className="bg-destructive hover:bg-destructive/90">
                            Delete Note
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function CollapsibleRightPanel() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [panels, setPanels] = useState<Panel[]>(() => {
    if (typeof window !== 'undefined') {
        const savedPanels = localStorage.getItem('customPanels');
        return savedPanels ? JSON.parse(savedPanels) : [{ id: 'jo-notes', title: 'JO Notes', type: 'jo-notes' }];
    }
    return [{ id: 'jo-notes', title: 'JO Notes', type: 'jo-notes' }];
  });

  const [activeTab, setActiveTab] = useState('jo-notes');

  const [textareaContents, setTextareaContents] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
        const savedContents = localStorage.getItem('textareaContents');
        return savedContents ? JSON.parse(savedContents) : {};
    }
    return {};
  });

  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('customPanels', JSON.stringify(panels));
  }, [panels]);

  useEffect(() => {
    localStorage.setItem('textareaContents', JSON.stringify(textareaContents));
  }, [textareaContents]);


  const buttonRef = useRef<HTMLDivElement>(null);
  const [yPosition, setYPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ y: 0 });
  const wasDragged = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setYPosition(window.innerHeight / 2 - 96); 

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    wasDragged.current = false;
    setIsDragging(true);
    dragStartPos.current = { y: e.clientY - yPosition };
    e.preventDefault();
  }, [yPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    animationFrameId.current = requestAnimationFrame(() => {
        wasDragged.current = true;
        const newY = Math.max(0, Math.min(window.innerHeight - 192, e.clientY - dragStartPos.current.y)); 
        setYPosition(newY);
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isUserLoading) {
      setIsExpanded(false);
    }
  }, [user?.uid, isUserLoading]);

  const handleButtonClick = () => {
    if (wasDragged.current) return;
    setIsExpanded(!isExpanded);
  }
  
  const addPanel = () => {
    if (panels.length < 3) {
      const newPanelId = `panel-${Date.now()}`;
      const newPanel: Panel = { id: newPanelId, title: '', type: 'textarea' };
      setPanels(prev => [...prev, newPanel]);
      setTextareaContents(prev => ({...prev, [newPanelId]: ''}));
      setActiveTab(newPanelId);
      setEditingPanelId(newPanelId);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingPanelId) return;
    const idToRemove = deletingPanelId;

    const newPanels = panels.filter(p => p.id !== idToRemove);
    setPanels(newPanels);

    if (activeTab === idToRemove) {
      setActiveTab(newPanels[0]?.id || 'jo-notes');
    }

    setTextareaContents(prev => {
      const newContents = { ...prev };
      delete newContents[idToRemove];
      return newContents;
    });

    setDeletingPanelId(null);
  };

  const handleTitleChange = (panelId: string, newTitle: string) => {
    setPanels(panels.map(p => (p.id === panelId ? { ...p, title: newTitle } : p)));
  };
  
  const handleTitleSave = () => {
    if (editingPanelId) {
        const panelBeingEdited = panels.find(p => p.id === editingPanelId);
        if (panelBeingEdited && !panelBeingEdited.title.trim() && panelBeingEdited.id !== 'jo-notes') {
            toast({
              variant: 'destructive',
              title: 'Panel Name Required',
              description: "Please provide a name for the panel or it will be removed."
            })
            const newPanels = panels.filter(p => p.id !== editingPanelId);
            setPanels(newPanels);
            if (activeTab === editingPanelId) {
                setActiveTab(newPanels[0]?.id || 'jo-notes');
            }
        }
    }
    setEditingPanelId(null);
  };


  if (!isMounted || isUserLoading || !user || user.isAnonymous) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed z-40 top-0 h-full no-print transition-transform duration-300 ease-in-out",
          isExpanded ? "translate-x-0" : "translate-x-full",
          "right-0 w-96" 
        )}
      >
        <div
            ref={buttonRef}
            className="absolute z-50 no-print"
            style={{ 
                top: `${yPosition}px`, 
                left: '-2.25rem'
            }}
            onMouseDown={handleMouseDown}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleButtonClick}
                    className={cn(
                        "relative h-48 w-9 p-1 rounded-r-none rounded-l-lg flex items-center justify-center transition-colors",
                        isExpanded ? 'bg-[#81cdc6]' : 'bg-[#81cdc6] hover:bg-[#69bab2]',
                        "text-white"
                    )}
                  >
                    <span className="[writing-mode:vertical-rl] rotate-180 font-bold tracking-wider">PERSONAL NOTES</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{isExpanded ? "Close Panel" : "Open Panel"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        <Card className="w-96 h-full shadow-xl rounded-none rounded-l-lg flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <CardHeader className="p-2 border-b space-y-2">
                    <Button onClick={addPanel} disabled={panels.length >= 3} variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Panel
                    </Button>
                    <TabsList className={cn("grid w-full", `grid-cols-${panels.length}`)}>
                        {panels.map((panel) => (
                           <div key={panel.id} className="relative group flex items-center">
                             <TabsTrigger value={panel.id} className="w-full data-[state=active]:relative" onDoubleClick={() => panel.type !== 'jo-notes' && setEditingPanelId(panel.id)}>
                                {editingPanelId === panel.id ? (
                                    <Input
                                        type="text"
                                        value={panel.title}
                                        onChange={(e) => handleTitleChange(panel.id, e.target.value)}
                                        onBlur={handleTitleSave}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                                handleTitleSave();
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        className="h-6 text-center bg-background text-foreground"
                                    />
                                ) : (
                                  <>
                                    {panel.title || 'Untitled'}
                                  </>
                                )}
                           </TabsTrigger>
                           {panel.type !== 'jo-notes' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeletingPanelId(panel.id); }}
                                    className="absolute top-1/2 -translate-y-1/2 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                           )}
                           </div>
                        ))}
                    </TabsList>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden">
                  <TabsContent value="jo-notes" className="h-full m-0">
                    <JoNotesPanel />
                  </TabsContent>
                  {panels.filter(p => p.type === 'textarea').map(panel => (
                      <TabsContent key={panel.id} value={panel.id} className="h-full m-0 p-2">
                         <div className="h-full">
                          <Textarea 
                              placeholder="Your notes here..."
                              className="h-full w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={textareaContents[panel.id] || ''}
                              onChange={(e) => setTextareaContents(prev => ({...prev, [panel.id]: e.target.value}))}
                          />
                         </div>
                      </TabsContent>
                  ))}
                </CardContent>
            </Tabs>
        </Card>
      </div>

      <AlertDialog open={!!deletingPanelId} onOpenChange={(isOpen) => !isOpen && setDeletingPanelId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete this panel and all its content. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
