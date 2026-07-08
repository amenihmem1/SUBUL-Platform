'use client';

import { useEffect, useCallback, useState } from 'react';
// socket.io-client typings differ across v2/v4; use a tolerant import to keep TS happy.
import io from 'socket.io-client';
import { getToken } from '@/lib/auth/token';
import { getBackendUrl } from '@/lib/api/client';
import { Notification } from '@/services/notifications';

export function useNotificationsSocket() {
  const [socket, setSocket] = useState<any | null>(null);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.log('No token available, skipping WebSocket connection');
      return;
    }

    console.log('Connecting to notifications WebSocket at:', `${getBackendUrl()}/notifications`);
    
    // Namespace `notifications` (Nest @WebSocketGateway namespace).
    // Prefer polling then upgrade: websocket-only often hits proxy/firewall issues and times out.
    const newSocket = (io as any)(`${getBackendUrl()}/notifications`, {
      auth: { token },
      // Try websocket first to avoid XHR polling failures in some environments.
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      upgrade: true,
      timeout: 30000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect_error', (error: unknown) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('connect', () => {
      console.log('connected to notifications gateway');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('disconnected from notifications gateway');
      setIsConnected(false);
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('realtime notification received:', notification);
      setLastNotification(notification);
      // Optional: Trigger a browser notification or a toast
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, lastNotification, isConnected };
}
