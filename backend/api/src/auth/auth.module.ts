import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalJwtStrategy } from './strategy/local-jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from './guards/roles.guard';
import { CompaniesModule } from '../companies/companies.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionGuard } from './guards/subscription.guard';
import { ReferralsModule } from '../referrals/referrals.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        return {
          secret,
          signOptions: {
            // jsonwebtoken StringValue typing; env is a string like "7d" or "24h"
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
    CompaniesModule,
    SubscriptionsModule,
    ReferralsModule,
    TypeOrmModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalJwtStrategy, RolesGuard, JwtAuthGuard, AdminGuard, SubscriptionGuard],
  exports: [
    PassportModule,
    JwtModule,
    RolesGuard,
    JwtAuthGuard,
    AdminGuard,
    SubscriptionGuard,
    AuthService,
    // So SubscriptionGuard can resolve SubscriptionsService in any module that imports AuthModule
    SubscriptionsModule,
  ],
})
export class AuthModule {}
