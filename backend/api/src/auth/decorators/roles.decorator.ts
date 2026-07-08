import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const ROLE_ADMIN = 'admin';
export const ROLE_STUDENT = 'student';
export const ROLE_COMPANY = 'company';
export const ROLE_EMPLOYER = 'employer';
export const ROLE_LEARNER = 'learner';

export const VALID_ROLES = [
  ROLE_ADMIN,
  ROLE_STUDENT,
  ROLE_COMPANY,
  ROLE_EMPLOYER,
  ROLE_LEARNER,
];