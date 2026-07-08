import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../common/upload.constants';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ── Static/named routes MUST come before @Get(':id') ──────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user', description: 'Returns the profile of the user identified by JWT.' })
  @ApiResponse({ status: 200, description: 'Current user profile returned' })
  @ApiResponse({ status: 401, description: 'No active session or invalid session' })
  async getCurrentUser(@Req() req: Request & { user: { id: number } }) {
    const user = await this.usersService.findByIdForMe(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile', description: 'Updates whitelisted profile fields (fullName, companyName, phone, address, bio, profilePicture) for the authenticated user.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName:       { type: 'string', example: 'Jane Doe' },
        companyName:    { type: 'string', example: 'Acme Corp' },
        phone:          { type: 'string', example: '+33612345678' },
        address:        { type: 'string', example: '10 rue de la Paix, Paris' },
        bio:            { type: 'string', example: 'Cloud enthusiast & lifelong learner' },
        profilePicture: { type: 'string', example: 'https://example.com/avatar.png' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(@Req() req: Request & { user: { id: number } }, @Body() updateData: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const allowedFields: Partial<UpdateUserDto> = {};
    if (updateData.fullName !== undefined) allowedFields.fullName = updateData.fullName;
    if (updateData.companyName !== undefined) allowedFields.companyName = updateData.companyName;
    if (updateData.phone !== undefined) allowedFields.phone = updateData.phone;
    if (updateData.address !== undefined) allowedFields.address = updateData.address;
    if (updateData.bio !== undefined) allowedFields.bio = updateData.bio;
    if (updateData.profilePicture !== undefined) allowedFields.profilePicture = updateData.profilePicture;
    return this.usersService.update(user.id, allowedFields as UpdateUserDto);
  }

  @Patch('me/track')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Persist the learner detected track (cloud | cyber | ai)', description: 'Saves the profile-quiz result to the user record.' })
  @ApiBody({ schema: { type: 'object', properties: { track: { type: 'string', example: 'cloud' } }, required: ['track'] } })
  @ApiResponse({ status: 200, description: 'Track saved' })
  async updateTrack(
    @Req() req: Request & { user: { id: number } },
    @Body() body: { track: string },
  ) {
    const allowed = ['cloud', 'cyber', 'ai'];
    if (!allowed.includes(body.track)) {
      throw new BadRequestException(`track must be one of: ${allowed.join(', ')}`);
    }
    return this.usersService.update(req.user.id, { track: body.track } as any);
  }

  @Post('profile-picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  }))
  @ApiOperation({ summary: 'Upload profile picture', description: 'Uploads a profile picture file for the current user.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file to upload' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Profile picture uploaded', schema: { example: { profilePicture: 'https://example.com/uploads/avatar.png' } } })
  @ApiResponse({ status: 400, description: 'No file uploaded or file too large (max 20MB)' })
  async uploadProfilePicture(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES })],
      }),
    )
    file: { originalname: string; filename?: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    const filename = file.filename || file.originalname;
    const profilePicture = `/uploads/${filename}`;
    await this.usersService.update(req.user.id, { profilePicture } as any);
    return { profilePicture };
  }

  // ── Generic CRUD ───────────────────────────────────────────────────────────

  @Get('test')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List all users (admin only)', description: 'Returns all users. Requires admin role.' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  findAllTest() {
    return this.usersService.findAll();
  }


  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Create a user', description: 'Creates a new user. Requires admin role.' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] List all users', description: 'Returns all users. Requires admin role.' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Update user status', description: 'Updates the status field of a user (e.g., active, inactive, suspended).' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', example: 'active' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.usersService.update(+id, { status: body.status } as UpdateUserDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Post(':id/verify-email')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Verify user email manually', description: 'Marks the user as email-verified without requiring them to click the verification link.' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmailAdmin(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) return { message: 'Email already verified', email: user.email };
    await this.usersService.verifyEmail(user.email);
    return { message: 'Email verified successfully', email: user.email };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Delete user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
