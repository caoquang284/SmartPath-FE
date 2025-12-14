'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
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

  // Auto-scroll hook
  const { scrollRef, scrollToBottom, handleScroll } = useAutoScroll([selectedChat?.messages]);

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

  const { connected, join, leave, markMessagesRead } = useChatHub({
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

      // Prevent adding duplicate messages
      const messageExists = (messages: Message[]) => messages.some(x => x.id === m.id || (x.id.startsWith('temp-') && x.senderId === m.senderId && x.content === m.content && Math.abs(new Date(x.createdAt).getTime() - new Date(m.createdAt).getTime()) < 5000));

      setSelectedChat(prev => {
        if (!prev || prev.id !== m.chatId) return prev;
        const messages = prev.messages ?? [];
        if (messageExists(messages)) return prev;
        const appended: Message = m;
        return { ...prev, messages: [...messages, appended] } as Chat;
      });

      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === m.chatId) {
            const messages = chat.messages ?? [];
            if (messageExists(messages)) return chat;
            const updatedMessages = [...messages, m].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        });
      });

      // Mark as read if it's not our message and we're viewing the chat
      if (selectedChatId === m.chatId && m.senderId !== currentUser?.id) {
        messageAPI.markRead(m.id).catch(() => {});
      }
    },
    onNewMessageNotification: (raw) => {
      const notification = {
        chatId: raw.chatId ?? raw.ChatId,
        messageId: raw.messageId ?? raw.MessageId,
        senderUsername: raw.senderUsername ?? raw.SenderUsername,
        content: raw.content ?? raw.Content,
        createdAt: raw.createdAt ?? raw.CreatedAt,
      };

      // Update chat list with new message preview
      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === notification.chatId) {
            const newMessage: Message = {
              id: notification.messageId,
              chatId: notification.chatId,
              content: notification.content,
              senderId: '', // Not provided in notification
              senderUsername: notification.senderUsername,
              isRead: false,
              createdAt: notification.createdAt,
            };
            const updatedMessages = [...(chat.messages ?? []), newMessage].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        });
      });

      // Also refresh the selected chat if it's the one that received the notification
      if (selectedChatId === notification.chatId) {
        (async () => {
          try {
            const chat = await chatAPI.getById(notification.chatId);
            setSelectedChat(chat);
          } catch (e) {
            console.error('Failed to refresh chat after notification:', e);
          }
        })();
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

      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === e.chatId) {
            const msgs = (chat.messages ?? []).map(x => x.id === e.messageId ? { ...x, isRead: true } : x);
            return { ...chat, messages: msgs };
          }
          return chat;
        });
      });
    },
    onMessageStatusUpdated: (raw) => {
      const e = {
        messageId: raw.messageId ?? raw.MessageId,
        isRead: raw.isRead ?? raw.IsRead,
        readerId: raw.readerId ?? raw.ReaderId,
      };

      setSelectedChat(prev => {
        if (!prev) return prev;
        const msgs = (prev.messages ?? []).map(x => x.id === e.messageId ? { ...x, isRead: e.isRead } : x);
        return { ...prev, messages: msgs } as Chat;
      });

      setChats(prev => {
        return prev.map(chat => {
          const msgs = (chat.messages ?? []).map(x => x.id === e.messageId ? { ...x, isRead: e.isRead } : x);
          return { ...chat, messages: msgs };
        });
      });
    },
    onMessagesReadInChat: (raw) => {
      const e = {
        chatId: raw.chatId ?? raw.ChatId,
        readerId: raw.readerId ?? raw.ReaderId,
        readAt: raw.readAt ?? raw.ReadAt,
      };

      setSelectedChat(prev => {
        if (!prev || prev.id !== e.chatId) return prev;
        const msgs = (prev.messages ?? []).map(x => x.senderId !== currentUser?.id ? { ...x, isRead: true } : x);
        return { ...prev, messages: msgs } as Chat;
      });

      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === e.chatId) {
            const msgs = (chat.messages ?? []).map(x => x.senderId !== currentUser?.id ? { ...x, isRead: true } : x);
            return { ...chat, messages: msgs };
          }
          return chat;
        });
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

    const tempId = `temp-${Date.now()}`;
    const content = messageInput.trim();
    setMessageInput('');

    // Optimistic update - add message immediately
    const optimisticMessage: Message = {
      id: tempId,
      chatId: selectedChatId,
      content,
      senderId: currentUser?.id ?? '',
      senderUsername: currentUser?.username ?? '',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Add to selected chat immediately
    setSelectedChat(prev => {
      if (!prev || prev.id !== selectedChatId) return prev;
      return { ...prev, messages: [...(prev.messages ?? []), optimisticMessage] } as Chat;
    });

    // Add to chat list
    setChats(prev => {
      return prev.map(chat => {
        if (chat.id === selectedChatId) {
          const updatedMessages = [...(chat.messages ?? []), optimisticMessage];
          return { ...chat, messages: updatedMessages };
        }
        return chat;
      });
    });

    try {
      const saved = await messageAPI.send({ chat_id: selectedChatId, content });

      // Replace temp message with real one
      const realMessage: Message = {
        id: (saved as any).id ?? (saved as any).Id,
        chatId: (saved as any).chatId ?? (saved as any).ChatId ?? selectedChatId,
        content: (saved as any).content ?? (saved as any).Content,
        senderId: (saved as any).senderId ?? (saved as any).SenderId ?? (currentUser?.id ?? ''),
        senderUsername: (saved as any).senderUsername ?? (saved as any).SenderUsername ?? (currentUser?.username ?? ''),
        isRead: (saved as any).isRead ?? (saved as any).IsRead ?? false,
        createdAt: (saved as any).createdAt ?? (saved as any).CreatedAt ?? new Date().toISOString(),
      };

      setSelectedChat(prev => {
        if (!prev || prev.id !== selectedChatId) return prev;
        const messages = prev.messages ?? [];
        const filtered = messages.filter(m => m.id !== tempId);
        return { ...prev, messages: [...filtered, realMessage] } as Chat;
      });

      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === selectedChatId) {
            const messages = chat.messages ?? [];
            const filtered = messages.filter(m => m.id !== tempId);
            return { ...chat, messages: [...filtered, realMessage] };
          }
          return chat;
        });
      });

    } catch (e) {
      console.error('Failed to send message:', e);

      // Remove optimistic message on failure
      setSelectedChat(prev => {
        if (!prev || prev.id !== selectedChatId) return prev;
        const messages = prev.messages ?? [];
        const filtered = messages.filter(m => m.id !== tempId);
        return { ...prev, messages: filtered } as Chat;
      });

      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === selectedChatId) {
            const messages = chat.messages ?? [];
            const filtered = messages.filter(m => m.id !== tempId);
            return { ...chat, messages: filtered };
          }
          return chat;
        });
      });

      // Restore message input on failure
      setMessageInput(content);
    }
  };

  useEffect(() => {
    if (!selectedChat || !currentUser?.id) return;
    const hasUnread = (selectedChat.messages ?? []).some(m => !m.isRead && m.senderId !== currentUser.id);
    if (hasUnread) {
      // Use bulk marking via API for better performance
      messageAPI.markAllAsReadInChat(selectedChat.id).catch(() => {});
      // Also use SignalR for real-time notification
      markMessagesRead(selectedChat.id).catch(() => {});
    }
  }, [selectedChat, currentUser?.id, markMessagesRead]);

  const otherMember = useMemo(() => selectedChat?.otherUser ?? null, [selectedChat]);

  // Calculate unread count for each chat
  const getUnreadCount = useCallback((chat: Chat) => {
    if (!currentUser?.id) return 0;
    return (chat.messages ?? []).filter(m => !m.isRead && m.senderId !== currentUser.id).length;
  }, [currentUser?.id]);

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
                        const unreadCount = getUnreadCount(chat);

                        return (
                          <button
                            key={chat.id}
                            onClick={() => handleSelectChat(chat.id)}
                            className={`w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left ${
                              selectedChatId === chat.id ? 'bg-slate-100 dark:bg-slate-900' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar>
                                  <AvatarImage src={avatarUrl} alt={title} />
                                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                                </Avatar>
                                {unreadCount > 0 && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </div>
                                )}
                              </div>
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
                      <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="space-y-4"
                      >
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
                                  <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>
                                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                    {isOwn && (
                                      <span className={`inline-flex items-center gap-1 ${message.isRead ? 'text-blue-500' : 'text-gray-400'}`}>
                                        {message.isRead ? (
                                          <>
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Read
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Sent
                                          </>
                                        )}
                                      </span>
                                    )}
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