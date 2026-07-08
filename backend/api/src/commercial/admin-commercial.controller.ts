import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CommercialService } from './commercial.service';
import {
  IsEmail, IsString, IsEnum, IsOptional, MaxLength,
} from 'class-validator';

class CreateCommercialBodyDto {
  @IsEmail()
  email!: string;

  @IsString() @MaxLength(128)
  fullName!: string;

  @IsString() @MaxLength(128)
  password!: string;

  @IsOptional() @IsString() @MaxLength(3)
  preferredCurrency?: string;

  @IsOptional() @IsString()
  notes?: string;
}

class UpdateCommercialBodyDto {
  @IsOptional() @IsString() @MaxLength(128)
  fullName?: string;

  @IsOptional() @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional() @IsString() @MaxLength(3)
  preferredCurrency?: string;

  @IsOptional() @IsString()
  notes?: string;
}

@Controller('api/admin/commercials')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCommercialController {
  constructor(private readonly service: CommercialService) {}

  @Get('overview')
  getOverview() {
    return this.service.getAdminOverview();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.service.getStats(id);
  }

  @Get(':id/codes')
  getCodes(@Param('id') id: string) {
    return this.service.getCodesForCommercial(id);
  }

  @Get(':id/referrals')
  getReferrals(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.service.getReferrals(id, parseInt(page), parseInt(limit), status ? { status } : undefined);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCommercialBodyDto) {
    const { user, profile } = await this.service.create(dto);
    return {
      id: profile.id,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      preferredCurrency: profile.preferredCurrency,
      status: profile.status,
      createdAt: profile.createdAt,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommercialBodyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string) {
    await this.service.deactivate(id);
  }

  // ─── CHART DATA (ADMIN) ──────────────────────────────────────────────────

  @Get(':id/chart/referrals')
  getCommercialReferralsChart(
    @Param('id') id: string,
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    return this.service.getReferralsChart(id, period, parseInt(range));
  }

  @Get(':id/chart/revenue')
  getCommercialRevenueChart(
    @Param('id') id: string,
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    return this.service.getRevenueChart(id, period, parseInt(range));
  }

  @Get('chart/referrals')
  getAdminReferralsChart(
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    return this.service.getAdminReferralsChart(period, parseInt(range));
  }

  @Get('chart/revenue')
  getAdminRevenueChart(
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    return this.service.getAdminRevenueChart(period, parseInt(range));
  }

  @Get('chart/top-codes')
  getAdminTopCodes(@Query('limit') limit = '5') {
    return this.service.getAdminTopCodes(parseInt(limit));
  }

  @Get('chart/top-commercials')
  getAdminTopCommercials(@Query('limit') limit = '5') {
    return this.service.getAdminTopCommercials(parseInt(limit));
  }
}
