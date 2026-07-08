import {
  Body, Controller, Get, Param, Post, Req, Res, UploadedFile,
  UseGuards, UseInterceptors, ParseUUIDPipe, NotFoundException, BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManualPaymentsService } from './manual-payments.service';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { BlobStorageService } from '../common/S3/s3.service';

const PROOF_BUCKET_PREFIX = 'manual-proofs';
const PROOF_UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, '../manual-proofs')
  : path.join(process.cwd(), 'uploads', 'manual-proofs');

function allowedMimeTypes(req: any, file: Express.Multer.File, cb: Function) {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
  }
}

const proofUpload = {
  storage: memoryStorage(),
  fileFilter: allowedMimeTypes,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
};

const diskFallbackStorage = diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(PROOF_UPLOAD_DIR, { recursive: true });
    cb(null, PROOF_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

@Controller('api/manual-payments')
@UseGuards(JwtAuthGuard)
export class ManualPaymentsController {
  private readonly logger = new Logger(ManualPaymentsController.name);

  constructor(
    private readonly service: ManualPaymentsService,
    private readonly blobStorage: BlobStorageService,
  ) {}

  /** Create a new manual payment request */
  @Post()
  create(@Req() req: any, @Body() dto: CreateManualPaymentDto) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.service.createRequest(userId, dto);
  }

  /** Get all my manual payment requests */
  @Get('my')
  getMyRequests(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.service.getMyRequests(userId);
  }

  /** Get a specific request (must belong to me) */
  @Get('my/:id')
  getMyRequestById(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.service.getMyRequestById(id, userId);
  }

  /** Serve a proof file — redirect to S3 presigned URL, or stream from local disk. */
  @Get('proof/:filename')
  async serveProof(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
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
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
    fs.createReadStream(filePath).pipe(res);
  }

  /** Upload proof of payment for a request */
  @Post(':id/proof')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: allowedMimeTypes,
      limits: { fileSize: 5 * 1024 * 1024 },
      // Dynamically choose storage at runtime based on S3 config
      storage: undefined,
    }),
  )
  async uploadProof(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const userId = req.user?.userId ?? req.user?.id;

    let s3Key: string | undefined;
    let localPath: string | undefined;

    if (this.blobStorage.isConfigured) {
      // ── Azure Blob Storage (primary) ───────────────────────────────
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      s3Key = `${PROOF_BUCKET_PREFIX}/${randomUUID()}${ext}`;
      await this.blobStorage.upload(s3Key, file.buffer, file.mimetype);
      this.logger.log(`[ManualPayment] Uploaded to Blob Storage: ${s3Key}`);
    } else {
      // ── Local disk fallback (when S3 env vars not set) ─────────────
      fs.mkdirSync(PROOF_UPLOAD_DIR, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const filename = `${randomUUID()}${ext}`;
      const filePath = path.join(PROOF_UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, file.buffer);
      // Persist a key-like reference so DB rows stay portable across hosts.
      localPath = `${PROOF_BUCKET_PREFIX}/${filename}`;
      this.logger.log(`[ManualPayment] Saved to local disk: ${filePath}`);
    }

    return this.service.uploadProof(id, userId, {
      s3Key,
      localPath,
      originalName: file.originalname,
    });
  }
}
