'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { botAPI } from '@/lib/api/botAPI';
import {
  BotConversationResponse,
  BotConversationWithMessagesResponse,
  BotMessageResponse,
  BotMessageRole,
} from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Bot as BotIcon,
  User as UserIcon,
  MoreVertical,
  Loader2,
  MessageSquarePlus,
  ArrowUpCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import clsx from 'clsx';
import SafeMarkdown from '@/components/ui/safe-markdown';

type ConversationItem = BotConversationResponse;

export default function ChatbotPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex">
          <Sidebar />

          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Chatbot AI</h1>
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

  // Left pane: conversations
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const hasMoreConvos = useMemo(() => conversations.length < total, [conversations.length, total]);

  // Current conversation & messages
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BotMessageResponse[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Compose
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Create dialog (optional system prompt)
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');

  useEffect(() => {
    if (!loadingMore) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMore]);

  const loadConversations = async (reset = true) => {
    try {
      setLoadingConvos(true);
      const data = await botAPI.mineConversations(reset ? 1 : page, pageSize);
      if (reset) {
        setConversations(data.items);
        setPage(1);
        setTotal(data.total);
      } else {
        setConversations((prev) => [...prev, ...data.items]);
        setTotal(data.total);
      }
    } catch (e: any) {
      toast({ title: 'Không tải được danh sách cuộc trò chuyện', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoadingConvos(false);
    }
  };

  const loadConversationWithMessages = async (id: string) => {
    try {
      setLoadingMessages(true);
      const res: BotConversationWithMessagesResponse = await botAPI.getConversationWithMessages(id, 50);
      setActiveId(res.id);
      setMessages(res.messages ?? []);
    } catch (e: any) {
      toast({ title: 'Không tải được hội thoại', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadPrevious = async () => {
    if (!activeId || messages.length === 0) return;
    try {
      setLoadingMore(true);
      const oldest = messages[0];
      const older = await botAPI.listMessages(activeId, 50, oldest.id);
      setMessages((prev) => [...older, ...prev]);
    } catch (e: any) {
      toast({ title: 'Không tải được tin nhắn cũ hơn', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const onSelectConversation = async (id: string) => {
    if (id === activeId) return;
    await loadConversationWithMessages(id);
  };

  const onCreateConversation = async () => {
    try {
      const resp = await botAPI.createConversation({
        title: newTitle || undefined,
        systemPrompt: newSystemPrompt || undefined,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewSystemPrompt('');
      await loadConversations(true);
      await loadConversationWithMessages(resp.id);
    } catch (e: any) {
      toast({ title: 'Tạo hội thoại thất bại', description: String(e?.message ?? e), variant: 'destructive' });
    }
  };

  const onRenameConversation = async () => {
    if (!renamingId) return;
    try {
      await botAPI.renameConversation(renamingId, { title: renameValue.trim() });
      setRenameOpen(false);
      setRenamingId(null);
      setRenameValue('');
      await loadConversations(true);
    } catch (e: any) {
      toast({ title: 'Đổi tên thất bại', description: String(e?.message ?? e), variant: 'destructive' });
    }
  };

  // === SEND: KHÔNG cho gửi nếu chưa chọn/tạo hội thoại ===
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    if (!activeId) {
      toast({
        title: 'Chưa có hội thoại',
        description: 'Vui lòng tạo hoặc chọn một hội thoại ở cột bên trái trước khi gửi tin nhắn.',
        variant: 'destructive',
      });
      return;
    }

    // Optimistic: hiện ngay tin user + placeholder AI
    const convId = activeId;
    const tempUser: BotMessageResponse = {
      id: `temp-user-${Date.now()}`,
      conversationId: convId,
      role: BotMessageRole.User,
      content: text,
      createdAt: new Date().toISOString(),
    };
    const tempAssistant: BotMessageResponse = {
      id: `temp-assistant-${Date.now()}`,
      conversationId: convId,
      role: BotMessageRole.Assistant,
      content: 'Đang soạn…',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUser, tempAssistant]);
    setInput('');
    setSending(true);

    try {
      const res = await botAPI.generate({
        conversationId: convId,
        userContent: text,
        contextLimit: 20,
      });

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        return [...filtered, res.userMessage, res.assistantMessage];
      });
      await loadConversations(true);
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistant.id));
      toast({ title: 'Gửi tin nhắn thất bại', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setSending(false);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // avatar
  const fullName = (profile as any)?.fullName ?? (profile as any)?.full_name ?? '';
  const userAvatar = (profile as any)?.avatarUrl ?? (profile as any)?.avatar_url ?? undefined;
  const assistantAvatar = '/ai-assistant.png'; // nếu bạn có ảnh riêng; nếu chưa có, AvatarFallback sẽ hiện icon robot

  function normalizeRole(r: unknown): 'assistant' | 'user' | 'system' {
    if (typeof r === 'number') {
      if (r === 2) return 'assistant';
      if (r === 1) return 'user';
      return 'system';
    }
    if (typeof r === 'string') {
      const s = r.toLowerCase();
      if (s.includes('assistant')) return 'assistant';
      if (s.includes('user')) return 'user';
      if (s.includes('system')) return 'system';
    }
    return 'user';
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
            {/* Left: conversations list */}
            <Card className="h-[calc(100vh-140px)] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xl">Hội thoại</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> New
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <div className="overflow-auto h-[calc(100vh-200px)]">
                  {loadingConvos && conversations.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Đang tải…</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Chưa có cuộc trò chuyện nào.</div>
                  ) : (
                    <ul className="divide-y">
                      {conversations.map((c) => (
                        <li
                          key={c.id}
                          className={clsx(
                            'px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer flex items-center justify-between',
                            activeId === c.id && 'bg-slate-100 dark:bg-slate-900'
                          )}
                          onClick={() => onSelectConversation(c.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">{c.title || 'New Chat'}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.updatedAt ?? c.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingId(c.id);
                                  setRenameValue(c.title ?? '');
                                  setRenameOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Đổi tên
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (async () => {
                                    try {
                                      await botAPI.deleteConversation(c.id);
                                      setConversations((prev) => prev.filter((x) => x.id !== c.id));
                                      if (activeId === c.id) {
                                        setActiveId(null);
                                        setMessages([]);
                                      }
                                    } catch (err: any) {
                                      toast({ title: 'Xoá hội thoại thất bại', description: String(err?.message ?? err), variant: 'destructive' });
                                    }
                                  })();
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xoá
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  )}
                  {hasMoreConvos && (
                    <div className="p-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const next = page + 1;
                            const data = await botAPI.mineConversations(next, pageSize);
                            setPage(next);
                            setConversations((prev) => [...prev, ...data.items]);
                            setTotal(data.total);
                          } catch (e: any) {
                            toast({ title: 'Không tải thêm được hội thoại', description: String(e?.message ?? e), variant: 'destructive' });
                          }
                        }}
                      >
                        Tải thêm…
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: chat area */}
            <Card className="h-[calc(100vh-140px)] flex flex-col overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {activeConversation?.title || (activeId ? 'New Chat' : 'Chatbot')}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {profile?.fullName ? `Xin chào, ${profile.fullName}` : 'Sinh viên SmartPath'}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 overflow-auto p-0">
                {/* Messages */}
                <div className="px-4 py-3">
                  {activeId ? (
                    <>
                      <div className="flex justify-center mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadPrevious}
                          disabled={loadingMore || loadingMessages || messages.length === 0}
                        >
                          {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpCircle className="h-4 w-4 mr-2" />}
                          Load previous
                        </Button>
                      </div>

                      {loadingMessages && messages.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Đang tải hội thoại…</div>
                      ) : messages.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Bắt đầu trao đổi với trợ lý của bạn 👋</div>
                      ) : (
                        <ul className="space-y-3">
                          {messages.map((m) => {
                            const role = normalizeRole(m.role as any);
                            const isAssistant = role === 'assistant';
                            const isUser = role === 'user';

                            return (
                              <li
                                key={m.id}
                                className={clsx(
                                  'flex items-start gap-3',
                                  isUser && 'flex-row-reverse' // user -> đẩy sang phải
                                )}
                              >
                                {/* Avatar */}
                                <Avatar className="h-8 w-8 mt-1">
                                  {isAssistant ? (
                                    <>
                                      <AvatarImage src={assistantAvatar} alt="AI" />
                                      <AvatarFallback className="bg-slate-800 text-white">
                                        <BotIcon className="h-4 w-4" />
                                      </AvatarFallback>
                                    </>
                                  ) : (
                                    <>
                                      <AvatarImage src={userAvatar} alt={fullName || 'Bạn'} />
                                      <AvatarFallback className="bg-blue-600 text-white">
                                        <UserIcon className="h-4 w-4" />
                                      </AvatarFallback>
                                    </>
                                  )}
                                </Avatar>

                                {/* Bubble */}
                                <div
                                  className={clsx(
                                    'rounded-2xl px-4 py-2 text-sm',
                                    isAssistant
                                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                      : 'bg-blue-600 text-white'
                                  )}
                                >
                                  {isAssistant ? (
                                    <SafeMarkdown isAssistant className="markdown-body" >
                                      {m.content || ''}
                                    </SafeMarkdown>
                                  ) : (
                                    <SafeMarkdown className="markdown-body">{m.content || ''}</SafeMarkdown>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                          <div ref={endRef} />
                        </ul>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Hãy chọn một hội thoại ở bên trái hoặc tạo hội thoại mới.
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Composer */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder={activeId ? 'Gõ tin nhắn cho trợ lý…' : 'Tạo hoặc chọn hội thoại để bắt đầu…'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    disabled={sending || !activeId}
                    className="resize-none"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !activeId || !input.trim()}
                    className="self-stretch"
                  >
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Gửi
                  </Button>
                </div>
                {!activeId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Bạn chưa chọn hội thoại. Hãy tạo hội thoại mới ở cột bên trái để bắt đầu trò chuyện.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Create conversation dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo hội thoại mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề (tuỳ chọn)</Label>
              <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sys">System Prompt (tuỳ chọn)</Label>
              <Textarea
                id="sys"
                rows={3}
                placeholder="Ví dụ: Bạn là trợ lý học tập cho sinh viên SmartPath…"
                value={newSystemPrompt}
                onChange={(e) => setNewSystemPrompt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={onCreateConversation}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên hội thoại</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">Tiêu đề</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Nhập tiêu đề mới"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={onRenameConversation}>
              <Pencil className="h-4 w-4 mr-2" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
