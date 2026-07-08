import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PaymentsService, AdminTxListQuery } from '../payments/payments.service';
import type { PaymentStatus } from '../payments/entities/payment-transaction.entity';

@ApiTags('Admin Payments')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/transactions')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Payment transaction KPIs (payment_transactions)' })
  async stats() {
    return this.payments.getAdminTransactionStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Time series + rollups for admin payments charts' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'granularity', required: false, enum: ['day', 'week', 'month', 'year'] })
  @ApiQuery({ name: 'provider', required: false, enum: ['stripe', 'flouci'] })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'plan', required: false, enum: ['standard', 'premium', 'free', 'unknown'] })
  async analytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
    @Query('provider') provider?: string,
    @Query('currency') currency?: string,
    @Query('plan') plan?: string,
  ) {
    const g = granularity as 'day' | 'week' | 'month' | 'year' | undefined;
    if (granularity && !['day', 'week', 'month', 'year'].includes(granularity)) {
      throw new BadRequestException('Invalid granularity');
    }
    const p = provider === 'stripe' || provider === 'flouci' ? provider : undefined;
    const planCat =
      plan === 'standard' || plan === 'premium' || plan === 'free' || plan === 'unknown' ? plan : undefined;
    return this.payments.getAdminTransactionAnalytics({
      from,
      to,
      granularity: g,
      provider: p,
      currency: currency?.trim() || undefined,
      plan: planCat,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List payment transactions (Stripe + Flouci)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'provider', required: false, enum: ['stripe', 'flouci'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'planSlug', required: false })
  @ApiQuery({ name: 'plan', required: false, enum: ['standard', 'premium', 'free', 'unknown'] })
  @ApiQuery({ name: 'billingCycle', required: false })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['created_desc', 'created_asc', 'amount_desc', 'amount_asc'],
  })
  async list(@Query() raw: Record<string, string | undefined>) {
    const q = this.parseListQuery(raw);
    return this.payments.listAdminTransactions(q);
  }

  private parseListQuery(raw: Record<string, string | undefined>): AdminTxListQuery {
    const page = raw.page ? parseInt(raw.page, 10) : undefined;
    const limit = raw.limit ? parseInt(raw.limit, 10) : undefined;
    const userId = raw.userId ? parseInt(raw.userId, 10) : undefined;
    if (raw.userId && Number.isNaN(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    const provider = raw.provider === 'stripe' || raw.provider === 'flouci' ? raw.provider : undefined;
    const plan =
      raw.plan === 'standard' || raw.plan === 'premium' || raw.plan === 'free' || raw.plan === 'unknown'
        ? raw.plan
        : undefined;
    const sort = raw.sort as AdminTxListQuery['sort'];
    if (
      raw.sort &&
      !['created_desc', 'created_asc', 'amount_desc', 'amount_asc'].includes(raw.sort)
    ) {
      throw new BadRequestException('Invalid sort');
    }
    return {
      page: page && !Number.isNaN(page) ? page : undefined,
      limit: limit && !Number.isNaN(limit) ? limit : undefined,
      provider,
      status: raw.status as PaymentStatus | undefined,
      planSlug: raw.planSlug?.trim() || undefined,
      plan,
      billingCycle: raw.billingCycle as AdminTxListQuery['billingCycle'],
      currency: raw.currency?.trim() || undefined,
      userId: userId && !Number.isNaN(userId) ? userId : undefined,
      email: raw.email?.trim() || undefined,
      search: raw.search?.trim() || undefined,
      from: raw.from?.trim() || undefined,
      to: raw.to?.trim() || undefined,
      sort,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one transaction with parsed provider metadata' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.getAdminTransactionDetail(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a Stripe transaction (full refund via Stripe API)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async refund(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.adminRefundStripeTransaction(id);
  }
}
