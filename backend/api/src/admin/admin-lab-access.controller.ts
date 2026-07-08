import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LabAccessService } from '../lab-access/lab-access.service';
import { CreateLabCredentialDto, UpdateLabCredentialDto } from '../lab-access/dto/create-lab-credential.dto';
import { GrantLabAccessDto, BulkGrantLabAccessDto } from '../lab-access/dto/grant-lab-access.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/lab-access')
export class AdminLabAccessController {
  constructor(private readonly labAccessService: LabAccessService) {}

  // ─── Credential Pool ──────────────────────────────────────────────────────

  @Get('credentials')
  listCredentials(@Query('provider') provider?: string) {
    return this.labAccessService.listCredentialsWithStatus(provider);
  }

  @Post('credentials')
  createCredential(@Body() dto: CreateLabCredentialDto) {
    return this.labAccessService.createCredential(dto);
  }

  @Patch('credentials/:id')
  updateCredential(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLabCredentialDto,
  ) {
    return this.labAccessService.updateCredential(id, dto);
  }

  @Delete('credentials/:id')
  async deleteCredential(@Param('id', ParseIntPipe) id: number) {
    await this.labAccessService.deleteCredential(id);
    return { deleted: true };
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Get('sessions')
  listSessions(@Query('provider') provider?: string) {
    return this.labAccessService.listActiveSessions(provider);
  }

  @Post('sessions')
  grantAccess(@Req() req: { user: { id: number } }, @Body() dto: GrantLabAccessDto) {
    return this.labAccessService.grantAccess(req.user.id, dto);
  }

  @Post('sessions/bulk')
  bulkGrantAccess(@Req() req: { user: { id: number } }, @Body() dto: BulkGrantLabAccessDto) {
    return this.labAccessService.bulkGrantAccess(req.user.id, dto);
  }

  @Delete('sessions/:id')
  async revokeAccess(@Param('id', ParseIntPipe) id: number) {
    await this.labAccessService.revokeAccess(id);
    return { revoked: true };
  }
}
