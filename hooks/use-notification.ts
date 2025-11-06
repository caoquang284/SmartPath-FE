'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationAPI } from '@/lib/api/notificationAPI';
import type { Notification } from '@/lib/types';

type Opts = {
  pollMs?: number;       
  enabled?: boolean;    
  resetOnDisable?: boolean; 
};

export function useNotifications(p?: number | Opts) {
  const opts: Opts = typeof p === 'number' ? { pollMs: p, enabled: p > 0 } : (p ?? {});
  const pollMs = opts.pollMs ?? 20000;
  const enabled = opts.enabled ?? true;
  const resetOnDisable = opts.resetOnDisable ?? true;

  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<number>(0);
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
    if (!enabled) return;          
    if (runningRef.current) return; 
    runningRef.current = true;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationAPI.mine(),
        notificationAPI.unreadCount(),
      ]);
      setItems(list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      setUnread(count);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const msg = (err?.message || err?.response?.data?.message || '').toString().toLowerCase();
      const isAuthGone = status === 401 || msg.includes('no refresh token') || msg.includes('unauthorized');
      if (isAuthGone) {
        if (resetOnDisable) {
          setItems([]);
          setUnread(0);
        }
      } else {
        console.debug('[notifications] refresh error:', err);
      }
    } finally {
      setLoading(false);
      runningRef.current = false;
    }
  }, [enabled, resetOnDisable]);

  useEffect(() => {
    safeClearTimer();

    if (!enabled) {
      if (resetOnDisable) {
        setItems([]);
        setUnread(0);
      }
      return; 
    }

    if (pollMs > 0) {
      refresh();
      timerRef.current = setInterval(refresh, pollMs);
    } else {
      refresh();
    }

    return () => safeClearTimer();
  }, [enabled, pollMs, refresh, resetOnDisable]);

  const markRead = useCallback(async (id: string) => {
    try {
      if (!enabled) return;
      await notificationAPI.markRead(id);
      setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } as Notification : n)));
      setUnread(u => Math.max(0, u - 1));
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status !== 401) console.debug('[notifications] markRead error:', err);
    }
  }, [enabled]);

  const removeLocal = useCallback((id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
  }, []);

  return { items, unread, loading, refresh, markRead, removeLocal, setItems };
}