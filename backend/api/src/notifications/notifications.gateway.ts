import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      const role = payload.role;

      if (!userId) {
        this.logger.error('Invalid token payload');
        client.disconnect();
        return;
      }

      // Join a room specific to the user ID
      client.join(`user_${userId}`);
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // If user is admin, join the admin room
      if (role === 'admin') {
        client.join('admin');
        this.logger.log(`User ${userId} joined admin room`);
      }
    } catch (error: any) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send a notification to a specific user.
   */
  sendToUser(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  /**
   * Send a notification to all admins.
   */
  sendToAdmins(notification: any) {
    this.server.to('admin').emit('notification', notification);
  }
}
