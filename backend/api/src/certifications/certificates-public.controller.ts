import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CertificationsService } from './certifications.service';

@ApiTags('Certificates')
@Controller('api/certificates')
export class CertificatesPublicController {
  constructor(private readonly certificationsService: CertificationsService) {}

  @Get('verify/:code')
  @ApiOperation({ summary: 'Public certificate verification by code' })
  @ApiParam({ name: 'code', type: String, description: 'Verification code' })
  @ApiResponse({ status: 200, description: 'Verification payload returned' })
  verifyCertificate(@Param('code') code: string) {
    return this.certificationsService.verifyIssuedCertificate(code);
  }
}
