
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
import { PlusCircle, Trash2, X, Edit, Save } from 'lucide-react';
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

function JoNotesPanel() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [currentNote, setCurrentNote] = useState('');
    const [allNotes, setAllNotes] = useState<Record<string, { lead: Lead; notes: Note[] }>>({});
    const [suggestions, setSuggestions] = useState<Lead[]>([]);

    const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
    const { data: allLeads } = useCollection<Lead>(leadsQuery);

    const getContactDisplay = (lead: Lead) => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
        if (mobile && landline) return `${mobile} / ${landline}`;
        return mobile || landline || '';
    };

    const formatJoNumber = (joNumber: number | undefined) => {
        if (!joNumber) return '';
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
        loadNotes(); // Reload and re-sort all notes
        
        setCurrentNote('');
        setSelectedLead(null);
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
        loadNotes(); // Reload and re-sort
    };

    const filteredNotes = useMemo(() => {
        if (!searchTerm) return allNotes;
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
    }, [allNotes, searchTerm]);

    useEffect(() => {
        if (!searchTerm || !allLeads) {
            setSuggestions([]);
            return;
        }
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        
        const matchingLeads = allLeads.filter(lead => 
            (lead.joNumber && formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedSearchTerm)) ||
            lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
            (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm))
        );

        const leadsWithoutNotes = matchingLeads.filter(lead => !allNotes[lead.id]);
        setSuggestions(leadsWithoutNotes.slice(0, 5));

    }, [searchTerm, allLeads, allNotes]);


    return (
        <div className="flex flex-col h-full">
            <div className="relative p-2">
                <Input 
                    placeholder="Search notes, or find lead to add note..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    className="h-9"
                />
                {suggestions.length > 0 && (
                    <Card className="absolute z-10 w-[calc(100%-1rem)] mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <CardHeader className="p-2 text-xs font-bold text-muted-foreground">Select a lead to add notes</CardHeader>
                        <CardContent className="p-0">
                            {suggestions.map((lead) => (
                                <div key={lead.id} className="p-2 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => { setSelectedLead(lead); setSearchTerm(''); setSuggestions([]); }}>
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
                            <div key={leadId} className="p-3 border rounded-lg bg-gray-50 text-xs">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-sm">{toTitleCase(lead.customerName)}</p>
                                        <p className="text-gray-600">{lead.joNumber ? formatJoNumber(lead.joNumber) : 'No J.O. yet'}</p>
                                        <p className="text-gray-500">{getContactDisplay(lead)}</p>
                                    </div>
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
                                </div>
                                <div className="mt-2 space-y-2 pl-4 border-l-2 ml-1">
                                    {notes.map(note => (
                                        <div key={note.id} className="group relative p-2 text-sm border rounded-md bg-yellow-50">
                                            <p className="whitespace-pre-wrap">{note.content}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(note.timestamp).toLocaleString()}</p>
                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteNote(leadId, note.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
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
                        <p className="text-xs font-medium">Adding note for: <span className="font-bold">{toTitleCase(selectedLead.customerName)}</span></p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedLead(null)}><X className="h-4 w-4"/></Button>
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
        </div>
    );
}

export function CollapsibleRightPanel() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [panels, setPanels] = useState<Panel[]>([{ id: 'jo-notes', title: 'JO Notes', type: 'jo-notes' }]);
  const [activeTab, setActiveTab] = useState('jo-notes');
  const [textareaContents, setTextareaContents] = useState<Record<string, string>>({});
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null);


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

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
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
            // This is a temporary removal for UX, it won't be saved until confirmed
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
          "fixed z-40 top-0 h-full w-96 no-print transition-transform duration-300 ease-in-out",
          isExpanded ? "right-0" : "right-[-24rem]"
        )}
      >
        <Card className="w-96 h-full shadow-xl rounded-none rounded-l-lg flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <CardHeader className="p-2 border-b space-y-2">
                    <Button onClick={addPanel} disabled={panels.length >= 3} variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Panel
                    </Button>
                    <TabsList className="grid w-full grid-cols-3">
                        {panels.map((panel) => (
                           <div key={panel.id} className="relative group">
                             <TabsTrigger value={panel.id} className="w-full" onDoubleClick={() => panel.type !== 'jo-notes' && setEditingPanelId(panel.id)}>
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
                                className="absolute top-[-5px] right-[-5px] h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
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
                           <Textarea 
                                placeholder="Your notes here..."
                                className="h-full w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                value={textareaContents[panel.id] || ''}
                                onChange={(e) => setTextareaContents(prev => ({...prev, [panel.id]: e.target.value}))}
                           />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
      </div>

      <div
        ref={buttonRef}
        className="fixed z-50 no-print"
        style={{ 
            top: `${yPosition}px`, 
            transform: isExpanded ? 'translateX(0)' : 'translateX(100%)',
            right: '24rem',
            transition: 'transform 0.3s ease-in-out',
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleButtonClick}
                onMouseDown={handleMouseDown}
                className={cn(
                    "relative h-48 w-9 p-1 rounded-r-none rounded-l-lg text-white flex items-center justify-center transition-colors",
                    isExpanded ? 'bg-[#81cdc6]' : 'bg-[#81cdc6] hover:bg-[#69bab2]'
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



