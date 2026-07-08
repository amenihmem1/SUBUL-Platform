import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HeygenService } from './heygen.service';

@Controller('api/heygen')
@UseGuards(JwtAuthGuard)
export class HeygenController {
  constructor(private readonly heygenService: HeygenService) {}

  @Get('token')
  async getStreamingToken(): Promise<{ token: string }> {
    const token = await this.heygenService.createStreamingToken();
    return { token };
  }
}
