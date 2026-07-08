'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';
import { Notification } from '@/services/notifications';

interface NotificationsContextType {
  lastNotification: Notification | null;
  isConnected: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { lastNotification, isConnected } = useNotificationsSocket();

  return (
    <NotificationsContext.Provider value={{ lastNotification, isConnected }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
