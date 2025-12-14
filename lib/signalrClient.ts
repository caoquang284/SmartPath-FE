'use client';
import * as signalR from '@microsoft/signalr';

export type NewMessageEvent = {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderUsername: string;
  isRead: boolean;
  createdAt: string;
};

export type NewMessageNotificationEvent = {
  chatId: string;
  messageId: string;
  senderUsername: string;
  content: string; // truncated to 50 chars
  createdAt: string;
};

export type MessageReadEvent = {
  messageId: string;
  chatId: string;
  readerId: string;
  readAt: string;
};

export type MessageStatusUpdatedEvent = {
  messageId: string;
  isRead: boolean;
  readerId: string;
};

export type MessagesReadInChatEvent = {
  chatId: string;
  readerId: string;
  readAt: string;
};

const g = globalThis as unknown as {
  __chatConn?: signalR.HubConnection;
  __chatStarted?: boolean;
  __chatHandlersSet?: boolean;
  __chatStartPromise?: Promise<void>;  
};

export function getHubConnection(hubUrl: string, tokenGetter: () => string | null) {
  if (!g.__chatConn) {
    g.__chatConn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => tokenGetter() ?? '',
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          ctx.previousRetryCount < 5 ? 1000 * (ctx.previousRetryCount + 1) : 5000,
      })
      .build();

    g.__chatConn.onclose(err => console.error('[SignalR] closed', err));
    g.__chatConn.onreconnecting(err => console.warn('[SignalR] reconnecting', err));
    g.__chatConn.onreconnected(id => console.log('[SignalR] reconnected', id));
  }
  return g.__chatConn!;
}

export async function ensureStarted(conn: signalR.HubConnection) {
  // Đọc state một lần
  let state: signalR.HubConnectionState = conn.state;

  // Nếu đã Connected thì xong
  if (state === signalR.HubConnectionState.Connected) return;

  // Nếu đang Connecting/Reconnecting: chờ nó ổn định (Connected hoặc Disconnected)
  if (
    state === signalR.HubConnectionState.Connecting ||
    state === signalR.HubConnectionState.Reconnecting
  ) {
    // Poll tối đa ~10s (50 * 200ms)
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 200));
      state = conn.state; // re-read thực tế
      if (
        state === signalR.HubConnectionState.Connected ||
        state === signalR.HubConnectionState.Disconnected
      ) {
        break;
      }
    }

    // Nếu đã Connected sau khi chờ thì return
    if (state === signalR.HubConnectionState.Connected) return;
  }

  // Chỉ start khi đang Disconnected — chống gọi song song bằng promise toàn cục
  if (state === signalR.HubConnectionState.Disconnected) {
    const gg = g as typeof g & { __chatStartPromise?: Promise<void> };
    if (!gg.__chatStartPromise) {
      gg.__chatStartPromise = conn.start().finally(() => {
        gg.__chatStartPromise = undefined;
      });
    }
    await gg.__chatStartPromise;
    g.__chatStarted = true;
    console.log('[SignalR] started');
  }
}

export function setHandlersOnce(
  conn: signalR.HubConnection,
  handlers: {
    onNewMessage?: (m: NewMessageEvent) => void;
    onNewMessageNotification?: (n: NewMessageNotificationEvent) => void;
    onMessageRead?: (e: MessageReadEvent) => void;
    onMessageStatusUpdated?: (e: MessageStatusUpdatedEvent) => void;
    onMessagesReadInChat?: (e: MessagesReadInChatEvent) => void;
  }
) {
  // Remove existing handlers to prevent duplicates
  conn.off('NewMessage');
  conn.off('NewMessageNotification');
  conn.off('MessageRead');
  conn.off('MessageStatusUpdated');
  conn.off('MessagesReadInChat');

  // Register new handlers
  if (handlers.onNewMessage) conn.on('NewMessage', handlers.onNewMessage);
  if (handlers.onNewMessageNotification) conn.on('NewMessageNotification', handlers.onNewMessageNotification);
  if (handlers.onMessageRead) conn.on('MessageRead', handlers.onMessageRead);
  if (handlers.onMessageStatusUpdated) conn.on('MessageStatusUpdated', handlers.onMessageStatusUpdated);
  if (handlers.onMessagesReadInChat) conn.on('MessagesReadInChat', handlers.onMessagesReadInChat);

  g.__chatHandlersSet = true;
}

export function stopOnUnload(conn: signalR.HubConnection) {
  if (typeof window === 'undefined') return;
  const handler = () => conn.stop().catch(() => {});
  window.addEventListener('beforeunload', handler, { once: true });
}

export async function waitUntilConnected(conn: signalR.HubConnection, timeoutMs = 10000) {
  // Đợi ensureStarted xử lý trạng thái Disconnected
  await ensureStarted(conn);

  let state: signalR.HubConnectionState = conn.state;
  if (state === signalR.HubConnectionState.Connected) return;

  const start = Date.now();
  while (true) {
    await new Promise((r) => setTimeout(r, 150));
    state = conn.state;
    if (state === signalR.HubConnectionState.Connected) return;
    if (state === signalR.HubConnectionState.Disconnected) {
      // cố start lại (phòng trường hợp bị rơi về Disconnected)
      await ensureStarted(conn);
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timeout waiting for SignalR connection to be Connected");
    }
  }
}

export async function invokeSafe<T = any>(
  conn: signalR.HubConnection,
  method: string,
  ...args: any[]
): Promise<T> {
  await waitUntilConnected(conn);
  return conn.invoke(method, ...args);
}
