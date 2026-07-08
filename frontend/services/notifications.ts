'use client';

import { api, API_PATHS } from '@/lib/api/client';

export interface Notification {
  id: string; // UUID
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

/** Get notifications for current user (learner, instructor, etc.) */
export const getUserNotifications = () =>
  api.get<Notification[]>('/api/notifications').then((r) => r.data);

/** Admin endpoint: get system/admin notifications. */
export const getAdminNotifications = () =>
  api.get<Notification[]>(API_PATHS.notifications('admin')).then((r) => r.data);

/** Employer endpoint: get notifications for current employer. */
export const getEmployerNotifications = () =>
  api.get<Notification[]>(API_PATHS.notifications('employer')).then((r) => r.data);

/** Mark notification as read. */
export const markNotificationAsRead = (id: string) =>
  api.patch<{ success: boolean }>(API_PATHS.notifications(`${id}/read`)).then((r) => r.data);

/** Notifications service object. */
export const notificationsService = {
  getUser: getUserNotifications,
  getAdmin: getAdminNotifications,
  getEmployer: getEmployerNotifications,
  markAsRead: markNotificationAsRead,
};
