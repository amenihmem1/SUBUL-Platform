import {
  Controller, Get, Post, Body, Query, HttpCode, HttpStatus,
  BadRequestException, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { UniversityService } from './university.service';
import { UniversityInvitesService } from './university-invites.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@ApiTags('University Auth')
@Controller('api/auth/university')
export class UniversityAuthController {
  constructor(
    private readonly universityService: UniversityService,
    private readonly invitesService: UniversityInvitesService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /* ── University owner setup ── */

  @Get('setup')
  @ApiOperation({ summary: 'Validate university setup token' })
  async validateSetup(@Query('token') token: string) {
    if (!token) throw new BadRequestException('token is required');
    return this.universityService.validateSetupToken(token);
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete university workspace setup (set password)' })
  async completeSetup(
    @Body() body: { token: string; fullName: string; password: string },
    @Req() req: Request,
  ) {
    if (!body.token || !body.fullName || !body.password) {
      throw new BadRequestException('token, fullName and password are required');
    }
    if (body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const { university, user } = await this.universityService.completeSetup(body.token, {
      fullName: body.fullName,
      passwordHash,
    });
    const token = this.jwtService.sign({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
      hasCompletedAssessment: user!.hasCompletedAssessment ?? false,
      isEmailVerified: true,
    });
    return { token, university: { id: university.id, name: university.name, slug: university.slug } };
  }

  /* ── Student / staff invite ── */

  @Get('invite')
  @ApiOperation({ summary: 'Validate invite token and return invite info' })
  async validateInvite(@Query('token') token: string) {
    if (!token) throw new BadRequestException('token is required');
    return this.invitesService.validateToken(token);
  }

  @Post('invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept university invite (new account or link existing)' })
  async acceptInvite(
    @Body() body: {
      token: string;
      fullName?: string;
      password?: string;
      existingUserId?: number;
    },
    @Req() req: Request,
  ) {
    if (!body.token) throw new BadRequestException('token is required');
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress;

    let passwordHash: string | undefined;
    if (body.password) {
      if (body.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
      passwordHash = await bcrypt.hash(body.password, 12);
    }

    const result = await this.invitesService.acceptInvite(body.token, {
      fullName: body.fullName,
      passwordHash,
      existingUserId: body.existingUserId,
      ipAddress: ip,
    });

    // Issue JWT for the new/linked user
    const user = await this.userRepo.findOne({ where: { id: result.userId } });
    if (!user) throw new BadRequestException('User not found after invite acceptance');
    const jwt = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      hasCompletedAssessment: user.hasCompletedAssessment ?? false,
      isEmailVerified: true,
    });
    return { token: jwt, universityId: result.universityId, role: result.role };
  }
}
