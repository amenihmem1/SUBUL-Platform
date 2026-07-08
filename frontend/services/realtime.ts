import ENV from '@/config/environment';
import SocketIOClient from 'socket.io-client';
import { getToken } from '@/lib/auth/token';

type Socket = ReturnType<typeof SocketIOClient>;

export interface WebSocketMessage {
  type: 'progress_update' | 'module_completed' | 'achievement_unlocked' | 'roadmap_updated';
  data: unknown;
  timestamp: number;
}

export interface ProgressUpdate {
  moduleId: string;
  progress: number;
  status: 'completed' | 'current' | 'locked' | 'upcoming';
  xp: number;
}

class RealTimeService {
  private ws: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private isConnecting = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        // Socket.IO requires http:// / https://, not ws:// / wss://
        const wsUrl = ENV.WS_URL.replace(/\/$/, '')
          .replace(/^ws:\/\//, 'http://')
          .replace(/^wss:\/\//, 'https://');
        this.ws = SocketIOClient(`${wsUrl}/notifications`, {
          transports: ['websocket'],
          reconnection: false, // handled manually below
          timeout: 10000,
          auth: {
            token: getToken(),
          },
        });

        this.ws.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('notification', (payload: unknown) => {
          try {
            const message = payload as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.handleReconnect();
        });

        this.ws.on('connect_error', (error: Error) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Realtime] WebSocket connect_error:', error.message);
          }
          this.isConnecting = false;
          reject(error);
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        this.connect().catch(() => {/* reconnect failed silently */});
      }, delay);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Realtime] Max reconnection attempts reached');
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message.data));
    }
  }

  subscribe<T>(eventType: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const listeners = this.listeners.get(eventType)!;
    listeners.add(callback as (data: unknown) => void);
    
    return () => {
      listeners.delete(callback as (data: unknown) => void);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  sendProgressUpdate(moduleId: string, progress: number): void {
    this.send({
      type: 'progress_update',
      data: { moduleId, progress },
      timestamp: Date.now()
    });
  }

  sendModuleCompletion(moduleId: string): void {
    this.send({
      type: 'module_completed',
      data: { moduleId, timestamp: Date.now() },
      timestamp: Date.now()
    });
  }

  private send(message: WebSocketMessage): void {
    if (this.ws?.connected) {
      this.ws.emit('notification', message);
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.connected === true;
  }
}

export const realTimeService = new RealTimeService();
export default realTimeService;
