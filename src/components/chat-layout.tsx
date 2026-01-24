
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/firestore-writes';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { format, isThisWeek, differenceInMinutes } from 'date-fns';

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

export interface DirectMessageChannel {
    participants: string[];
    lastMessage?: {
        senderId: string;
        text: string;
        timestamp: any;
        readBy: string[];
        deliveredTo?: string[];
    };
    unreadCount?: {
        [key: string]: number;
    }
}
const ChatMessageItem = React.memo(({ msg, showTimestamp, formattedTimestamp, isLastMessage, user, selectedUser, channels, channelId }: { msg: ChatMessage, showTimestamp: boolean, formattedTimestamp: string, isLastMessage: boolean, user: UserProfile | null, selectedUser: UserProfile | null, channels: DirectMessageChannel[] | null, channelId: string | null }) => {
  const isMyMessage = msg.senderId === user?.uid;

  return (
    <React.Fragment>
      {showTimestamp && (
        <div className="text-center text-xs text-gray-500 my-2">
          {formattedTimestamp}
        </div>
      )}
      <div
        className={cn(
            "flex w-full",
            !showTimestamp && 'mt-1',
            isMyMessage ? "justify-end" : "justify-start"
        )}
      >
        <div className={cn(
            "flex flex-col gap-1",
            isMyMessage ? "items-end" : "items-start"
        )}>
            <div
                className={cn(
                    "max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2",
                    isMyMessage
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-300 text-black"
                )}
            >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
             {isLastMessage && isMyMessage && (
                <div className="text-xs font-bold text-muted-foreground text-right px-1">
                    {(() => {
                        const recipientId = selectedUser?.uid;
                        const channel = channels?.find(c => c.id === channelId);
                        const lastMessageInfo = channel?.lastMessage;

                        if (!lastMessageInfo || !recipientId || lastMessageInfo.senderId !== user?.uid || lastMessageInfo.text !== msg.text) {
                            return null;
                        }

                        if (lastMessageInfo.readBy?.includes(recipientId)) {
                            return 'Seen';
                        }
                        if (lastMessageInfo.deliveredTo?.includes(recipientId)) {
                            return 'Delivered';
                        }
                        return 'Sent';
                    })()}
                </div>
            )}
        </div>
      </div>
    </React.Fragment>
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';


export function ChatLayout() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), orderBy('nickname', 'asc')) : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const channelsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'direct_messages'), where('participants', 'array-contains', user.uid));
  }, [firestore, user]);
  const { data: channels } = useCollection<DirectMessageChannel>(channelsQuery);

  const channelId = useMemo(() => {
    if (!user || !selectedUser) return null;
    return [user.uid, selectedUser.uid].sort().join('_');
  }, [user, selectedUser]);
  
  // State for paginated messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [moreMessagesLoading, setMoreMessagesLoading] = useState(false);
  const [lastMessageDoc, setLastMessageDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);


  // Auto-scroll to bottom for new messages, but only if user is already near the bottom
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
        const isScrolledToBottom = scrollContainer.scrollHeight - scrollContainer.clientHeight <= scrollContainer.scrollTop + 100; // 100px threshold
        if (isScrolledToBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [messages.length, messages[messages.length - 1]?.id]);


  // Read status update
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
  }, [selectedUser, channelId, firestore, user, messages]);

  // Textarea auto-resize
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      const scrollHeight = messageInputRef.current.scrollHeight;
      const maxHeight = 60;
      messageInputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);
  
  const messagesRef = useMemoFirebase(() => {
    if (!firestore || !channelId) return null;
    return collection(firestore, `direct_messages/${channelId}/messages`);
  }, [firestore, channelId]);

  // Initial fetch and real-time listener for new messages
  useEffect(() => {
    if (!messagesRef) return;
    setMessagesLoading(true);
    setHasMore(true);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
        
        setMessages(newMessages);

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastMessageDoc(lastVisible);
        setHasMore(snapshot.docs.length >= 20);
        setMessagesLoading(false);
    }, (error) => {
        console.error("Error fetching messages:", error);
        setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [messagesRef]);

  const loadOlderMessages = async () => {
    if (!messagesRef || !lastMessageDoc || !hasMore || moreMessagesLoading) return;

    setMoreMessagesLoading(true);
    const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastMessageDoc),
        limit(20)
    );
    
    try {
        const documentSnapshots = await getDocs(q);
        const olderMessages = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();

        const scrollContainer = scrollRef.current;
        const oldScrollHeight = scrollContainer?.scrollHeight || 0;
        const oldScrollTop = scrollContainer?.scrollTop || 0;

        setMessages(prevMessages => [...olderMessages, ...prevMessages]);
        
        const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastMessageDoc(lastVisible);
        setHasMore(documentSnapshots.docs.length >= 20);

        if (scrollContainer) {
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = oldScrollTop + (scrollContainer.scrollHeight - oldScrollHeight);
            });
        }
    } catch (error) {
        console.error("Error loading older messages:", error);
    } finally {
        setMoreMessagesLoading(false);
    }
  };
  
  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 2;
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !channelId || !firestore || !selectedUser) return;

    const channelRef = doc(firestore, 'direct_messages', channelId);
    const messagesCollectionRef = collection(channelRef, 'messages');
    
    const messageData = { senderId: user.uid, text: message, timestamp: serverTimestamp() };

    const deliveredToArray: string[] = [];
    if (isOnline(selectedUser.lastSeen)) {
        deliveredToArray.push(selectedUser.uid);
    }
    const lastMessageData = { 
        senderId: user.uid, 
        text: message, 
        timestamp: serverTimestamp(), 
        readBy: [user.uid],
        deliveredTo: deliveredToArray,
    };
    
    const currentMessageText = message;
    setMessage('');

    try {
      const otherUserId = selectedUser.uid;
      const channelSnap = await getDoc(channelRef);

      if (channelSnap.exists()) {
          const updateData = { lastMessage: lastMessageData, [`unreadCount.${otherUserId}`]: increment(1) };
          updateDocumentNonBlocking(channelRef, updateData);
      } else {
          const newChannelData = { 
              participants: [user.uid, otherUserId], 
              lastMessage: lastMessageData, 
              unreadCount: { [user.uid]: 0, [otherUserId]: 1 } 
          };
          setDocumentNonBlocking(channelRef, newChannelData, {});
      }
      addDocumentNonBlocking(messagesCollectionRef, messageData);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessage(currentMessageText);
      toast({ variant: 'destructive', title: 'Message not sent', description: 'Could not send your message. Please try again.' });
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

  const getInitials = (nickname: string | undefined) => {
    if (!nickname) return '';
    return nickname.charAt(0).toUpperCase();
  };

  const sortedUsers = useMemo(() => {
    if (!users || !user) return [];
    const otherUsers = users.filter(
      (u) => u.uid !== user.uid && u.position && u.position !== 'Not Assigned'
    );

    return otherUsers.sort((a, b) => {
        const channelA = channels?.find(c => c.participants.includes(user.uid) && c.participants.includes(a.uid));
        const channelB = channels?.find(c => c.participants.includes(user.uid) && c.participants.includes(b.uid));

        const unreadA = channelA?.unreadCount?.[user.uid] || 0;
        const unreadB = channelB?.unreadCount?.[user.uid] || 0;

        if (unreadA > 0 && unreadB === 0) return -1;
        if (unreadB > 0 && unreadA === 0) return 1;

        const timestampA = channelA?.lastMessage?.timestamp?.toDate() || new Date(0);
        const timestampB = channelB?.lastMessage?.timestamp?.toDate() || new Date(0);

        if (timestampA > timestampB) return -1;
        if (timestampB > timestampA) return 1;

        return a.nickname.localeCompare(b.nickname);
    });
  }, [users, user, channels]);

  if (!selectedUser) {
    return (
        <div className="flex flex-col h-full rounded-t-lg overflow-hidden" style={{ backgroundColor: '#e6fafa' }}>
            <div className="p-4 border-b flex justify-between items-center rounded-t-lg" style={{ backgroundColor: '#d9f7f2' }}>
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
                {sortedUsers.map(u => {
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
                        "w-full text-left py-2 px-4 flex items-center gap-4 hover:bg-black/10 border-b border-black/5",
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
    <div className="flex flex-col h-full rounded-t-lg" style={{ backgroundColor: '#e6fafa' }}>
        <div className="p-4 border-b flex items-center gap-4 rounded-t-lg" style={{ backgroundColor: '#d9f7f2' }}>
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
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-1">
                {moreMessagesLoading && (
                    <div className="flex justify-center my-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {hasMore && !moreMessagesLoading && (
                    <div className="text-center">
                        <Button variant="link" onClick={loadOlderMessages} className="text-xs h-6 p-0">
                            See older messages
                        </Button>
                    </div>
                )}
            {messagesLoading ? (
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
                    <ChatMessageItem
                        key={msg.id}
                        msg={msg}
                        showTimestamp={showTimestamp}
                        formattedTimestamp={formattedTimestamp}
                        isLastMessage={index === messages.length - 1}
                        user={user as UserProfile}
                        selectedUser={selectedUser}
                        channels={channels}
                        channelId={channelId}
                    />
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
