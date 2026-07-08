import { SetMetadata } from '@nestjs/common';
import { CustomDecorator } from '@nestjs/common';

export const SKIP_AUTH_KEY = 'skipAuth';
export const SkipAuth = (): CustomDecorator<string> => SetMetadata(SKIP_AUTH_KEY, true);

export default SkipAuth;