import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRoles: string[] = Array.isArray(user?.roles)
      ? user.roles
      : user?.role
        ? [String(user.role).toLowerCase()]
        : [];
    if (userRoles.length === 0) {
      throw new ForbiddenException('No roles defined');
    }

    const hasRole = requiredRoles.some((r) => userRoles.includes(String(r).toLowerCase()));
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User has: ${userRoles.join(', ') || 'none'}`
      );
    }

    return true;
  }
}