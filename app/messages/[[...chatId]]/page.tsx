'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { chatAPI } from '@/lib/api/chatAPI';
import { messageAPI } from '@/lib/api/messageAPI';
import type { Chat, Message } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useChatHub } from '@/hooks/use-chat';

export default function MessagesPage() {
  const params = useParams<{ chatId?: string[] }>();
  const router = useRouter();
  const { profile: currentUser } = useAuth();

  const chatIdFromUrl = Array.isArray(params.chatId) ? params.chatId[0] : undefined;

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(chatIdFromUrl);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const lastJoinedRef = useRef<string | null>(null);

  const {profile}=useAuth()
  if (!profile) {
    return (
<div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Chat</h1>
              <p className="text-muted-foreground">
                Đăng nhập để sử dụng tính năng này
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
    );
  }

  const { connected, join, leave } = useChatHub({
    selectedChatId,
    onNewMessage: (raw) => {
      const m = {
        id: raw.id ?? raw.Id,
        chatId: raw.chatId ?? raw.ChatId,
        content: raw.content ?? raw.Content,
        senderId: raw.senderId ?? raw.SenderId,
        senderUsername: raw.senderUsername ?? raw.SenderUsername,
        isRead: raw.isRead ?? raw.IsRead,
        createdAt: raw.createdAt ?? raw.CreatedAt,
      };

      setSelectedChat(prev => {
        if (!prev || prev.id !== m.chatId) return prev;
        if (prev.messages?.some(x => x.id === m.id)) return prev;
        const appended: Message = m;
        return { ...prev, messages: [...(prev.messages ?? []), appended] } as Chat;
      });

      if (selectedChatId === m.chatId && m.senderId !== currentUser?.id) {
        messageAPI.markRead(m.id).catch(() => {});
      }
    },
    onMessageRead: (raw) => {
      const e = {
        messageId: raw.messageId ?? raw.MessageId,
        chatId: raw.chatId ?? raw.ChatId,
        readerId: raw.readerId ?? raw.ReaderId,
      };

      setSelectedChat(prev => {
        if (!prev || prev.id !== e.chatId) return prev;
        const msgs = (prev.messages ?? []).map(x => x.id === e.messageId ? { ...x, isRead: true } : x);
        return { ...prev, messages: msgs } as Chat;
      });
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const mine = await chatAPI.getMine();
        setChats(mine);
        if (!chatIdFromUrl && mine.length > 0) {
          setSelectedChatId(mine[0].id);
          router.replace(`/messages/${mine[0].id}`);
        } else {
          setSelectedChatId(chatIdFromUrl);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [chatIdFromUrl, router]);

  useEffect(() => {
    if (!selectedChatId) { setSelectedChat(null); return; }
    (async () => {
      try {
        const chat = await chatAPI.getById(selectedChatId);
        setSelectedChat(chat);

        if (connected) {
          if (lastJoinedRef.current && lastJoinedRef.current !== selectedChatId) {
            await leave(lastJoinedRef.current).catch(() => {});
          }
          await join(selectedChatId);
          lastJoinedRef.current = selectedChatId;
        }
      } catch (e) {
        console.error(e);
        setSelectedChat(null);
      }
    })();
  }, [selectedChatId, connected, join, leave]);

  const handleSelectChat = useCallback((id: string) => {
    setSelectedChatId(id);
    router.push(`/messages/${id}`);
  }, [router]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId) return;
    try {
      const saved = await messageAPI.send({ chat_id: selectedChatId, content: messageInput.trim() });
      setMessageInput('');

      const m: Message = {
        id: (saved as any).id ?? (saved as any).Id,
        chatId: (saved as any).chatId ?? (saved as any).ChatId ?? selectedChatId,
        content: (saved as any).content ?? (saved as any).Content,
        senderId: (saved as any).senderId ?? (saved as any).SenderId ?? (currentUser?.id ?? ''),
        senderUsername: (saved as any).senderUsername ?? (saved as any).SenderUsername ?? (currentUser?.username ?? ''),
        isRead: (saved as any).isRead ?? (saved as any).IsRead ?? false,
        createdAt: (saved as any).createdAt ?? (saved as any).CreatedAt ?? new Date().toISOString(),
      };

      setSelectedChat(prev => {
        if (!prev || prev.id !== m.chatId) return prev;
        if (prev.messages?.some(x => x.id === m.id)) return prev;
        return { ...prev, messages: [...(prev.messages ?? []), m] } as Chat;
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!selectedChat || !currentUser?.id) return;
    const unread = (selectedChat.messages ?? []).filter(m => !m.isRead && m.senderId !== currentUser.id);
    unread.forEach(m => messageAPI.markRead(m.id).catch(() => {}));
  }, [selectedChat, currentUser?.id]);

  const otherMember = useMemo(() => selectedChat?.otherUser ?? null, [selectedChat]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Messages</h1>
              <p className="text-muted-foreground">Chat with friends and groups</p>
            </div>

            {/* Khung cố định chiều cao, con tự cuộn */}
            <div className="grid grid-cols-12 gap-4 h-[70vh] min-h-0">
              {/* Sidebar chats */}
              <Card className="col-span-4 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {loading ? (
                      <div className="text-sm text-muted-foreground p-3">Loading...</div>
                    ) : chats.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-3">No chats</div>
                    ) : (
                      chats.map((chat) => {
                        const title = chat.otherUser?.fullName ?? 'Unknown';
                        const avatarUrl = chat.otherUser?.avatarUrl ?? undefined;
                        const avatarFallback = (chat.otherUser?.fullName?.[0] ?? 'D').toUpperCase();
                        const lastMessage = (chat.messages ?? [])
                          .slice()
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                        return (
                          <button
                            key={chat.id}
                            onClick={() => handleSelectChat(chat.id)}
                            className={`w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left ${
                              selectedChatId === chat.id ? 'bg-slate-100 dark:bg-slate-900' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={avatarUrl} alt={title} />
                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{title}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {lastMessage?.content || 'No messages yet'}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Main pane */}
              <Card className="col-span-8 flex min-h-0 flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherMember?.avatarUrl ?? ''} alt={otherMember?.fullName ?? 'Direct'} />
                        <AvatarFallback>{(otherMember?.fullName?.[0] ?? 'D').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{otherMember?.fullName ?? 'Direct Chat'}</div>
                        <div className="text-sm text-muted-foreground">
                          {connected ? 'Connected' : 'Connecting...'}
                        </div>
                      </div>
                    </div>

                    {/* Quan trọng: flex-1 + min-h-0 để phần này cuộn, không đẩy card */}
                    <ScrollArea className="flex-1 min-h-0 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {(selectedChat.messages ?? []).map((message) => {
                          const isOwn = message.senderId === currentUser?.id;
                          return (
                            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={isOwn ? (currentUser?.avatarUrl ?? '') : (otherMember?.avatarUrl ?? '')}
                                    alt={message.senderUsername}
                                  />
                                  <AvatarFallback>{message.senderUsername?.charAt(0) ?? 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className={`rounded-lg p-3 ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>
                                    <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                                  </div>
                                  <div className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                    {isOwn && message.isRead ? ' • Read' : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Select a chat to start messaging</p>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}