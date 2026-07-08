import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { USER_ROLES } from '../common/constants';

@Injectable()
export class UniversityStaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const u = req.user as { role?: string; universityId?: string };
    const r = (u?.role || '').toLowerCase();
    const isUniversityStaff =
      (r === USER_ROLES.UNIVERSITY || r === 'university_owner') && !!u?.universityId;
    if (!isUniversityStaff) {
      throw new ForbiddenException('University staff only');
    }
    return true;
  }
}
