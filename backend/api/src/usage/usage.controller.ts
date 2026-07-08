import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageService } from './usage.service';
import { VoiceSttUsageDto, VoiceTtsUsageDto } from './dto/voice-usage.dto';

@Controller('api/usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post('voice-stt')
  async reportStt(@Request() req: any, @Body() dto: VoiceSttUsageDto) {
    await this.usageService.recordSttUsage(req.user.userId, dto);
    return { recorded: true };
  }

  @Post('voice-tts')
  async reportTts(@Request() req: any, @Body() dto: VoiceTtsUsageDto) {
    await this.usageService.recordTtsUsage(req.user.userId, dto);
    return { recorded: true };
  }
}
