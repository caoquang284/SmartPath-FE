'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatAPI } from '@/lib/api/chatAPI';
import type { Chat } from '@/lib/types';

export function useMessageNotifications(currentUserId?: string) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const safeClearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const refresh = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    try {
      const mine = await chatAPI.getMine();
      setChats(mine);
      const totalUnread = mine.reduce((sum, chat) => {
        const messages = chat.messages ?? [];
        const unread = messages.filter(m => !m.isRead && m.senderId !== currentUserId).length;
        return sum + unread;
      }, 0);
      setUnreadCount(totalUnread);
    } catch (err: any) {
      console.debug('[message notifications] refresh error:', err);
    } finally {
      setLoading(false);
      runningRef.current = false;
    }
  }, [currentUserId]);

  useEffect(() => {
    safeClearTimer();
    if (currentUserId) {
      refresh();
      timerRef.current = setInterval(refresh, 30000); // Poll every 30 seconds
    }

    return () => safeClearTimer();
  }, [refresh, currentUserId]);

  const markChatRead = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const messages = chat.messages ?? [];
        const updatedMessages = messages.map(m => ({ ...m, isRead: true }));
        return { ...chat, messages: updatedMessages };
      }
      return chat;
    }));
    setUnreadCount(prev => Math.max(0, prev - (chats.find(c => c.id === chatId)?.messages?.filter(m => !m.isRead && m.senderId !== currentUserId).length || 0)));
  }, [chats, currentUserId]);

  return { unreadCount, chats, loading, refresh, markChatRead };
}