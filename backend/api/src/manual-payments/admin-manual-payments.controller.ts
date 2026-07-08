import {
  Body, Controller, Get, Param, Patch, Query, Res,
  Req, UseGuards, ParseUUIDPipe, NotFoundException, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ManualPaymentsService, type ManualPaymentAdminSort } from './manual-payments.service';
import { ApproveManualPaymentDto } from './dto/approve-manual-payment.dto';
import { RejectManualPaymentDto } from './dto/reject-manual-payment.dto';
import { BlobStorageService } from '../common/S3/s3.service';

const PROOF_BUCKET_PREFIX = 'manual-proofs';
const PROOF_UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, '../manual-proofs')
  : path.join(process.cwd(), 'uploads', 'manual-proofs');

@Controller('api/admin/manual-payments')
export class AdminManualPaymentsController {
  private readonly logger = new Logger(AdminManualPaymentsController.name);

  constructor(
    private readonly service: ManualPaymentsService,
    private readonly blobStorage: BlobStorageService,
  ) {}

  /** List with search + filter */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  list(
    @Query('page')          page?: string,
    @Query('limit')         limit?: string,
    @Query('search')        search?: string,
    @Query('status')        status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('planSlug')      planSlug?: string,
    @Query('currency')      currency?: string,
    @Query('from')          from?: string,
    @Query('to')            to?: string,
    @Query('sort')          sort?: string,
  ) {
    return this.service.adminList({
      page:          page  ? parseInt(page,  10) : 1,
      limit:         limit ? parseInt(limit, 10) : 20,
      search,
      status,
      paymentMethod,
      planSlug,
      currency,
      from,
      to,
      sort: sort as ManualPaymentAdminSort | undefined,
    });
  }

  /** Aggregated analytics (validated revenue = approved only) */
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  stats(
    @Query('search')        search?: string,
    @Query('status')        status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('planSlug')      planSlug?: string,
    @Query('currency')      currency?: string,
    @Query('from')          from?: string,
    @Query('to')            to?: string,
    @Query('granularity')   granularity?: string,
  ) {
    const g = granularity as 'day' | 'week' | 'month' | 'year' | undefined;
    const gran =
      g === 'week' || g === 'month' || g === 'year' || g === 'day' ? g : 'day';
    return this.service.adminStats({
      search,
      status,
      paymentMethod,
      planSlug,
      currency,
      from,
      to,
      granularity: gran,
    });
  }

  /** Get single request detail */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  /** Approve payment + activate subscription */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approve(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveManualPaymentDto,
  ) {
    const adminId = req.user?.userId ?? req.user?.id;
    return this.service.adminApprove(id, adminId, dto);
  }

  /** Reject payment request */
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reject(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectManualPaymentDto,
  ) {
    const adminId = req.user?.userId ?? req.user?.id;
    return this.service.adminReject(id, adminId, dto);
  }

  /** Serve proof file — redirect to S3 presigned URL, or stream from local disk.
   *  NO auth required — presigned URLs are unguessable and time-limited.
   *  Auth would break <img src> / <a target="_blank> which don't send JWT. */
  @Get('proof/:filename')
  async serveProof(@Param('filename') filename: string, @Res() res: Response) {
    const safe = path.basename(filename);
    const key = `${PROOF_BUCKET_PREFIX}/${safe}`;

    if (this.blobStorage.isConfigured) {
      try {
        const url = await this.blobStorage.getDownloadUrl(key);
        return res.redirect(302, url);
      } catch (err) {
        this.logger.warn(
          `[ManualPayment] Blob proof lookup failed for ${key}; trying local fallback (${(err as any)?.message ?? 'unknown error'})`,
        );
      }
    }

    // Local disk fallback
    const filePath = path.join(PROOF_UPLOAD_DIR, safe);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Proof file not found');
    }
    const ext = path.extname(safe).toLowerCase();
    const mime: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
    fs.createReadStream(filePath).pipe(res);
  }

  /** Ask user to re-upload proof */
  @Patch(':id/request-proof')
  @UseGuards(JwtAuthGuard, AdminGuard)
  requestNewProof(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes?: string,
  ) {
    const adminId = req.user?.userId ?? req.user?.id;
    return this.service.adminRequestNewProof(id, adminId, notes);
  }
}
