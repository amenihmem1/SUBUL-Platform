import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AdminAssignUserSubscriptionDto } from './dto/admin-assign-user-subscription.dto';
import { AdminPatchUserSubscriptionDto } from './dto/admin-patch-user-subscription.dto';

@ApiTags('Admin')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/subscription-plans')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List subscription plans (read-only catalog). Use scope=learner-personal for free/standard/premium only.',
  })
  list(@Query('scope') scope?: string) {
    if (scope === 'learner-personal') {
      return this.subscriptionsService.findLearnerPersonalPlansForAdmin();
    }
    return this.subscriptionsService.findAllPlans();
  }
}

@ApiTags('Admin')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/user-subscriptions')
export class AdminUserSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List user subscriptions' })
  list(@Query('userId') userId?: string) {
    return this.subscriptionsService.listUserSubscriptions(userId ? +userId : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Assign plan to user' })
  assign(@Body() body: AdminAssignUserSubscriptionDto) {
    return this.subscriptionsService.assignUserSubscription(body.userId, body.planId, body.status ?? 'active', {
      start: body.periodStart ? new Date(body.periodStart) : undefined,
      end: body.periodEnd ? new Date(body.periodEnd) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() body: AdminPatchUserSubscriptionDto) {
    return this.subscriptionsService.updateUserSubscription(id, { ...body });
  }
}
