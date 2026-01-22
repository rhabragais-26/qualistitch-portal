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
import { PlusCircle, Trash2, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { toTitleCase } from '@/lib/utils';

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

const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
};

function JoNotesPanel() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState('');

    const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
    const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

    const suggestions = useMemo(() => {
        if (!searchTerm || !allLeads) return [];
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return allLeads.filter(lead => 
            (lead.joNumber && formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedSearchTerm)) ||
            lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
            (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
            (lead.contactNumber && lead.contactNumber.includes(lowercasedSearchTerm)) ||
            (lead.landlineNumber && lead.landlineNumber.includes(lowercasedSearchTerm))
        ).slice(0, 5);
    }, [searchTerm, allLeads]);

    useEffect(() => {
        if (selectedLead) {
            const savedNotes = localStorage.getItem(`notes_${selectedLead.id}`);
            if (savedNotes) {
                setNotes(JSON.parse(savedNotes));
            } else {
                setNotes([]);
            }
        } else {
            setNotes([]);
        }
    }, [selectedLead]);

    const handleSaveNote = () => {
        if (!selectedLead || !currentNote.trim()) return;
        const newNote: Note = {
            id: new Date().toISOString(),
            content: currentNote,
            timestamp: new Date().toISOString(),
        };
        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        localStorage.setItem(`notes_${selectedLead.id}`, JSON.stringify(updatedNotes));
        setCurrentNote('');
    };
    
    const handleDeleteNote = (noteId: string) => {
        if (!selectedLead) return;
        const updatedNotes = notes.filter(n => n.id !== noteId);
        setNotes(updatedNotes);
        localStorage.setItem(`notes_${selectedLead.id}`, JSON.stringify(updatedNotes));
    }
    
    const getContactDisplay = (lead: Lead) => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
        if (mobile && landline) return `${mobile} / ${landline}`;
        return mobile || landline || '';
    };

    return (
        <div className="flex flex-col h-full">
            <div className="relative p-2">
                <Input 
                    placeholder="Search JO #, Customer, Company, or Contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => { if(!selectedLead) setSearchTerm('')}}
                    className="h-9"
                />
                {suggestions.length > 0 && searchTerm && (
                    <Card className="absolute z-10 w-[calc(100%-1rem)] mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <CardContent className="p-2 max-h-40 overflow-y-auto">
                            {suggestions.map((lead) => (
                                <div key={lead.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => { setSelectedLead(lead); setSearchTerm(''); }}>
                                    <p className="font-semibold">{toTitleCase(lead.customerName)} {lead.joNumber ? `(${formatJoNumber(lead.joNumber)})` : ''}</p>
                                    <p className="text-xs text-gray-500">{toTitleCase(lead.companyName || '')}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {selectedLead && (
                <div className="p-2 m-2 border rounded-lg bg-gray-50 text-xs">
                    <p><strong>Notes for:</strong> {toTitleCase(selectedLead.customerName)} ({formatJoNumber(selectedLead.joNumber)})</p>
                    <p><strong>Contact:</strong> {getContactDisplay(selectedLead)}</p>
                </div>
            )}
            
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-2">
                    {notes.map(note => (
                        <div key={note.id} className="group relative p-2 text-sm border rounded-md bg-yellow-50">
                            <p className="whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(note.timestamp).toLocaleString()}</p>
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            
            <div className="p-2 mt-auto border-t">
                <Textarea 
                    placeholder={selectedLead ? "Add a new note..." : "Select a lead to add notes."}
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    disabled={!selectedLead}
                    className="min-h-[80px]"
                />
                <Button onClick={handleSaveNote} disabled={!selectedLead || !currentNote.trim()} className="w-full mt-2">Save Note</Button>
            </div>
        </div>
    );
}

export function CollapsibleRightPanel() {
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [panels, setPanels] = useState<Panel[]>([{ id: 'jo-notes', title: 'JO Notes', type: 'jo-notes' }]);
  const [activeTab, setActiveTab] = useState('jo-notes');
  const [textareaContents, setTextareaContents] = useState<Record<string, string>>({});
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);


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
    
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    
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
      const newPanelId = `panel-${panels.length + 1}`;
      setPanels([...panels, { id: newPanelId, title: `Panel ${panels.length + 1}`, type: 'textarea' }]);
      setTextareaContents(prev => ({...prev, [newPanelId]: ''}));
      setActiveTab(newPanelId);
    }
  };

  const removePanel = (idToRemove: string) => {
    const newPanels = panels.filter(p => p.id !== idToRemove);
    setPanels(newPanels);
    if(activeTab === idToRemove) {
      setActiveTab(newPanels[0]?.id || 'jo-notes');
    }
    setTextareaContents(prev => {
        const newContents = {...prev};
        delete newContents[idToRemove];
        return newContents;
    });
  };

  const handleTitleChange = (panelId: string, newTitle: string) => {
    setPanels(panels.map(p => (p.id === panelId ? { ...p, title: newTitle } : p)));
  };
  
  const handleTitleSave = () => {
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
          isExpanded ? "right-0" : "right-[-24rem]" // w-96 is 24rem
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
                           <TabsTrigger key={panel.id} value={panel.id} className="relative group" onDoubleClick={() => panel.type !== 'jo-notes' && setEditingPanelId(panel.id)}>
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
                                        {panel.title}
                                        {panel.type !== 'jo-notes' && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); removePanel(panel.id); }}
                                                className="absolute top-[-5px] right-[-5px] h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                                            >
                                                <X className="h-3 w-3" />
                                            </div>
                                        )}
                                    </>
                                )}
                           </TabsTrigger>
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
        className={cn(
          "fixed z-50 no-print transition-transform duration-300 ease-in-out",
          isExpanded && "translate-x-[-24rem]" // w-96 is 24rem
        )}
        style={{ top: `${yPosition}px`, right: 0 }}
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
    </>
  );
}
