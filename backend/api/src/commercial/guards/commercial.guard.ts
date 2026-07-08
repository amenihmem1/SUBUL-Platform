import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class CommercialGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const role = user.role?.toLowerCase();
    if (role !== 'commercial' && role !== 'admin') {
      throw new ForbiddenException('Commercial access required');
    }

    return true;
  }
}
