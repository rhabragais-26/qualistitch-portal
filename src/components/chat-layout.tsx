'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { format, isToday, isThisWeek, differenceInMinutes } from 'date-fns';
import { Separator } from './ui/separator';

interface UserProfile {
  uid: string;
  nickname: string;
  photoURL?: string;
  lastSeen?: string;
  position?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

interface DirectMessageChannel {
    participants: string[];
    lastMessage?: {
        senderId: string;
        text: string;
        timestamp: any;
        readBy: string[];
    };
    unreadCount?: {
        [key: string]: number;
    }
}

export function ChatLayout() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), orderBy('nickname', 'asc')) : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const channelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'direct_messages'), orderBy('lastMessage.timestamp', 'desc')) : null, [firestore]);
  const { data: channels } = useCollection<DirectMessageChannel>(channelsQuery);

  const channelId = useMemo(() => {
    if (!user || !selectedUser) return null;
    return [user.uid, selectedUser.uid].sort().join('_');
  }, [user, selectedUser]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !channelId) return null;
    return query(collection(firestore, `direct_messages/${channelId}/messages`), orderBy('timestamp', 'asc'));
  }, [firestore, channelId]);
  const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUser && channelId && firestore && user) {
        const channelRef = doc(firestore, 'direct_messages', channelId);
        
        const updateReadStatus = async () => {
            const docSnap = await getDoc(channelRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as DirectMessageChannel;
                const updates: {[key: string]: any} = {};

                if (data.lastMessage && data.lastMessage.senderId !== user.uid && !data.lastMessage.readBy?.includes(user.uid)) {
                    updates['lastMessage.readBy'] = arrayUnion(user.uid);
                }
                
                if (data.unreadCount && data.unreadCount[user.uid] > 0) {
                    updates[`unreadCount.${user.uid}`] = 0;
                }

                if (Object.keys(updates).length > 0) {
                    await updateDoc(channelRef, updates);
                }
            }
        };
        updateReadStatus();
    }
  }, [selectedUser, channelId, firestore, user]);

  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      const scrollHeight = messageInputRef.current.scrollHeight;
      const maxHeight = 60; // max height of ~2-3 lines
      messageInputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const sendMessage = async () => {
    if (!message.trim() || !user || !channelId || !firestore || !selectedUser) {
        return;
    }

    const channelRef = doc(firestore, 'direct_messages', channelId);
    const messagesRef = collection(channelRef, 'messages');

    const messageData = {
        senderId: user.uid,
        text: message,
        timestamp: serverTimestamp(),
    };
    
    const lastMessageData = {
        senderId: user.uid,
        text: message,
        timestamp: serverTimestamp(),
        readBy: [user.uid]
    };

    try {
      const otherUserId = selectedUser.uid;
      const channelSnap = await getDoc(channelRef);

      if (channelSnap.exists()) {
          await updateDoc(channelRef, {
              lastMessage: lastMessageData,
              [`unreadCount.${otherUserId}`]: increment(1)
          });
      } else {
          await setDoc(channelRef, {
              participants: [user.uid, selectedUser.uid],
              lastMessage: lastMessageData,
              unreadCount: {
                  [user.uid]: 0,
                  [otherUserId]: 1,
              },
          });
      }
      
      await addDoc(messagesRef, messageData);

      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 2;
  };
  
  const getInitials = (nickname: string | undefined) => {
    if (!nickname) return '';
    return nickname.charAt(0).toUpperCase();
  };

  if (!selectedUser) {
    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: '#e6fafa' }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: '#d9f7f2' }}>
                <h2 className="text-xl font-bold">Chats</h2>
                <p className="text-xs text-black/70 max-w-sm text-left pl-5">
                    This chat function is only intended for Follow Ups, Reminders and Order-related transactions. Do not use this for non-work-related stuffs. (press <span className="font-bold">ESC</span> to close)
                </p>
            </div>
            <ScrollArea className="flex-1">
            {usersLoading ? (
                <div className="p-4 space-y-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : (
                <ul>
                {users?.filter(u => u.uid !== user?.uid).map(u => {
                    const channel = channels?.find(c => c.participants.includes(user!.uid) && c.participants.includes(u.uid));
                    const lastMessage = channel?.lastMessage;
                    const isUnread = lastMessage && lastMessage.senderId !== user!.uid && !lastMessage.readBy?.includes(user!.uid);
                    const lastMessageSender = lastMessage ? users?.find(sender => sender.uid === lastMessage.senderId) : null;
                    const senderNickname = lastMessageSender ? (lastMessageSender.uid === user?.uid ? "You" : lastMessageSender.nickname) : '';
                    const unreadCount = channel?.unreadCount?.[user!.uid] || 0;

                    return (
                    <li key={u.uid}>
                    <button
                        className={cn(
                        "w-full text-left py-2 px-4 flex items-center gap-4 hover:bg-black/10",
                        )}
                        onClick={() => setSelectedUser(u)}
                    >
                        <div className="relative">
                        <Avatar>
                            <AvatarImage src={u.photoURL} alt={u.nickname} />
                            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(u.nickname)}</AvatarFallback>
                        </Avatar>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold">{u.nickname}</span>
                                {u.position && <span className="text-xs text-black/70">({u.position})</span>}
                            </div>
                            <Separator className="my-1 bg-gray-300" />
                            {unreadCount > 0 ? (
                                <p className="text-sm text-black font-bold truncate italic">
                                    {unreadCount} new unread message{unreadCount > 1 ? 's' : ''}
                                </p>
                            ) : lastMessage ? (
                                (() => {
                                    const fullMessage = `${senderNickname ? `${senderNickname}: ` : ''}${lastMessage.text}`;
                                    const truncatedMessage = fullMessage.length > 35 ? `${fullMessage.substring(0, 32)}...` : fullMessage;
                                    return (
                                        <p className={cn("text-sm text-black/70 truncate italic", isUnread && "font-bold")}>
                                            {truncatedMessage}
                                        </p>
                                    );
                                })()
                            ) : (
                                <p className="text-sm text-black/70 italic">No conversations yet</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs ml-auto">
                            <div className={cn("w-2.5 h-2.5 rounded-full", isOnline(u.lastSeen) ? "bg-green-500" : "bg-gray-400")} />
                            <span className="text-black/70">{isOnline(u.lastSeen) ? "Active" : "Inactive"}</span>
                        </div>
                    </button>
                    </li>
                )})}
                </ul>
            )}
            </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#e6fafa' }}>
        <div className="p-4 border-b flex items-center gap-4" style={{ backgroundColor: '#d9f7f2' }}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="relative">
            <Avatar>
                <AvatarImage src={selectedUser.photoURL} alt={selectedUser.nickname} />
                <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(selectedUser.nickname)}</AvatarFallback>
            </Avatar>
            </div>
            <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold leading-tight">{selectedUser.nickname}</h2>
                {selectedUser.position && <span className="text-xs text-black/70">({selectedUser.position})</span>}
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs ml-auto">
                <div className={cn("w-2.5 h-2.5 rounded-full", isOnline(selectedUser.lastSeen) ? "bg-green-500" : "bg-gray-400")} />
                <span className="text-black/70">{isOnline(selectedUser.lastSeen) ? "Active" : "Inactive"}</span>
            </div>
        </div>
        <ScrollArea className="flex-1 p-4">
            <div>
            {messagesLoading && !messages ? (
                <div className="flex justify-center items-center h-full">
                    <p>Loading messages...</p>
                </div>
            ) : messages && messages.length > 0 ? (
                messages.map((msg, index) => {
                  const showTimestamp =
                    index === 0 ||
                    (messages[index - 1].timestamp &&
                      msg.timestamp &&
                      differenceInMinutes(
                        msg.timestamp.toDate(),
                        messages[index - 1].timestamp.toDate()
                      ) > 5);

                  let formattedTimestamp = '';
                  if (msg.timestamp) {
                    const date = msg.timestamp.toDate();
                    if (isThisWeek(date, { weekStartsOn: 1 })) {
                      formattedTimestamp = format(date, "EEE 'at' h:mm aa");
                    } else {
                      formattedTimestamp = format(date, "MMM-dd 'at' h:mm aa");
                    }
                  }

                  return (
                    <React.Fragment key={msg.id}>
                      {showTimestamp && (
                        <div className="text-center text-xs text-gray-500 my-2">
                          {formattedTimestamp}
                        </div>
                      )}
                      <div
                        className={cn(
                            "flex w-full",
                            !showTimestamp && index > 0 && 'mt-1',
                            msg.senderId === user?.uid ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                            "flex flex-col gap-1",
                            msg.senderId === user?.uid ? "items-end" : "items-start"
                        )}>
                            <div
                                className={cn(
                                    "max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2",
                                    msg.senderId === user?.uid
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-amber-300 text-black"
                                )}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
            ) : (
                <div className="flex justify-center items-center h-full">
                    <p className="text-black/70">No messages yet. Start the conversation!</p>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
        <div className="p-4 border-t" style={{ backgroundColor: '#d9f7f2' }}>
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <Textarea
                  ref={messageInputRef}
                  rows={1}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  autoComplete="off"
                  className="pr-12 resize-none min-h-0 no-scrollbar"
              />
              <Button type="submit" size="icon" disabled={!message.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-transparent hover:bg-black/10 text-black">
                  <Send className="h-5 w-5" />
              </Button>
            </form>
        </div>
    </div>
  );
}
