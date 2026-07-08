import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, Req
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';

@Controller('api/admin/promo-codes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PromoCodesController {
  constructor(private readonly promoService: PromoCodesService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.promoService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.promoService.findById(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.promoService.getStats(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePromoCodeDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.sub || req.user?.id;
    return this.promoService.create(dto, adminId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.promoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.promoService.remove(id);
  }
}

// Separate controller for public promo code validation (authenticated users)
import { Controller as Ctrl2 } from '@nestjs/common';

@Ctrl2('api/promo-codes')
export class PromoCodesPublicController {
  constructor(private readonly promoService: PromoCodesService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body() body: { code: string; planSlug: string; currency: string; originalAmountCents: number },
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.promoService.validateCode(
      body.code, body.planSlug, body.currency, body.originalAmountCents, userId
    );
  }

  @Post('validate/guest')
  @HttpCode(HttpStatus.OK)
  async validateGuest(
    @Body() body: { code: string; planSlug: string; currency: string; originalAmountCents: number },
  ) {
    return this.promoService.validateCode(
      body.code, body.planSlug, body.currency, body.originalAmountCents, undefined
    );
  }
}
