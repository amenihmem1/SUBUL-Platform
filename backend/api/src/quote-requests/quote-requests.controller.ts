import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestStatusDto } from './dto/update-quote-request-status.dto';
import { QuoteRequestStatus } from './entities/quote-request.entity';
import { QuoteRequestsService } from './quote-requests.service';

@Controller('api/quote-requests')
export class QuoteRequestsPublicController {
  constructor(private readonly quoteRequests: QuoteRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateQuoteRequestDto) {
    return this.quoteRequests.create(dto);
  }
}

@Controller('api/admin/quote-requests')
@UseGuards(JwtAuthGuard, AdminGuard)
export class QuoteRequestsAdminController {
  constructor(private readonly quoteRequests: QuoteRequestsService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: QuoteRequestStatus,
  ) {
    return this.quoteRequests.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.quoteRequests.findById(id);
  }

  @Patch(':id/status')
  async patchStatus(@Param('id') id: string, @Body() dto: UpdateQuoteRequestStatusDto) {
    return this.quoteRequests.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.quoteRequests.remove(id);
  }
}
