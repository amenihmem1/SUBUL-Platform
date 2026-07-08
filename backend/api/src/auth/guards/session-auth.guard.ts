import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionCookie = request.cookies?.auth_session;

    if (!sessionCookie) {
      throw new UnauthorizedException('No session cookie found');
    }

    let session: any;
    try {
      const parts = sessionCookie.split('.');
      if (parts.length !== 2) {
        throw new UnauthorizedException('Invalid session format');
      }

      const [payload, signature] = parts;
      const secret = this.configService.get<string>('SESSION_SECRET') || 'fallback-secret-for-dev-only';
      
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new UnauthorizedException('Invalid session signature');
      }

      session = JSON.parse(payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid or tampered session cookie');
    }

    if (!session?.user?.email) {
      throw new UnauthorizedException('Invalid session: missing user email');
    }

    if (session.expires && new Date(session.expires) < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.usersService.findByEmail(session.user.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }
}
