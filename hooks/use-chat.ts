'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getHubConnection, ensureStarted, setHandlersOnce, stopOnUnload, invokeSafe } from '@/lib/signalrClient';
import { useAccessToken } from './use-access-token';

export function useChatHub(opts?: {
  hubUrl?: string;
  onNewMessage?: (m: any) => void;
  onMessageRead?: (e: any) => void;
  selectedChatId?: string | undefined;
}) {
  const { hubUrl = process.env.NEXT_PUBLIC_HUB_URL ?? '', onNewMessage, onMessageRead, selectedChatId } = opts || {};
  const { tokenRef } = useAccessToken();
  const [connected, setConnected] = useState(false);
  const connRef = useRef<ReturnType<typeof getHubConnection> | null>(null);
  const currentChatRef = useRef<string | undefined>(undefined);
  const lifecycleSetRef = useRef(false); // đảm bảo chỉ set 1 lần/instance

  const tokenGetter = useCallback(() => tokenRef.current, [tokenRef]);

  useEffect(() => {
    if (!hubUrl) return;
    const conn = getHubConnection(hubUrl, tokenGetter);
    connRef.current = conn;

    setHandlersOnce(conn, { onNewMessage, onMessageRead });

    // ensure start
    ensureStarted(conn)
      .then(async () => {
        setConnected(true);
        stopOnUnload(conn);

        // Re-join chat đã chọn (nếu có)
        if (currentChatRef.current) {
          try {
            await invokeSafe(conn, 'JoinChat', currentChatRef.current);
          } catch (e) {
            console.error('[SignalR] JoinChat after start failed', e);
          }
        }

        // Đăng ký rejoin sau khi reconnect (chỉ 1 lần)
        if (!lifecycleSetRef.current) {
          (conn as any).onreconnected?.(async () => {
            try {
              if (currentChatRef.current) {
                await invokeSafe(conn, 'JoinChat', currentChatRef.current);
              }
              setConnected(true);
            } catch (e) {
              console.error('[SignalR] rejoin after reconnect failed', e);
            }
          });
          (conn as any).onreconnecting?.(() => setConnected(false));
          (conn as any).onclose?.(() => setConnected(false));
          lifecycleSetRef.current = true;
        }
      })
      .catch(err => console.error('[SignalR] start failed', err));

    return () => {
      // không stop ở đây nếu muốn giữ kết nối global xuyên trang
    };
  }, [hubUrl, tokenGetter, onNewMessage, onMessageRead]);

  // Join/Leave khi selectedChatId thay đổi
  useEffect(() => {
    if (!connRef.current) return;
    const conn = connRef.current;
    const prev = currentChatRef.current;
    const next = selectedChatId;

    (async () => {
      try {
        if (prev && prev !== next) {
          // Leave không cần Connected tuyệt đối, nhưng an toàn thì vẫn chờ
          await invokeSafe(conn, 'LeaveChat', prev);
        }
        if (next) {
          await invokeSafe(conn, 'JoinChat', next);
        }
        currentChatRef.current = next;
      } catch (e) {
        console.error('Join/Leave failed', e);
      }
    })();
  }, [selectedChatId]);

  const join = useCallback(async (chatId: string) => {
    if (!connRef.current) return;
    await invokeSafe(connRef.current, 'JoinChat', chatId);
    currentChatRef.current = chatId;
  }, []);

  const leave = useCallback(async (chatId: string) => {
    if (!connRef.current) return;
    await invokeSafe(connRef.current, 'LeaveChat', chatId);
    if (currentChatRef.current === chatId) currentChatRef.current = undefined;
  }, []);

  return { connected, join, leave };
}
