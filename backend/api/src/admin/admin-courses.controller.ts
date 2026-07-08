import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoursesService } from '../courses/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { UpdateCourseDto } from '../courses/dto/update-course.dto';

@ApiTags('Admin')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/courses')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all courses with pagination' })
  @ApiQuery({ name: 'certificationId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of courses' })
  async list(
    @Query('certificationId') certificationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const certId = certificationId != null && certificationId !== '' ? parseInt(certificationId, 10) : undefined;
    return this.coursesService.findAll(certId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by id or courseId (full unified shape for edit)' })
  @ApiParam({ name: 'id', description: 'Numeric id or courseId string' })
  @ApiResponse({ status: 200, description: 'Course with modules, lessons, labs' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getOne(@Param('id') id: string) {
    const numericId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    return this.coursesService.findOneForAdmin(numericId);
  }

  @Post()
  @ApiOperation({ summary: 'Create course (unified structure)' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course created' })
  @ApiResponse({ status: 409, description: 'Course with courseId already exists' })
  async create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update course (unified structure, partial ok)' })
  @ApiParam({ name: 'id', description: 'Numeric id or courseId string' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, description: 'Course updated' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    const numericId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    return this.coursesService.update(numericId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete course' })
  @ApiParam({ name: 'id', description: 'Numeric id or courseId string' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id') id: string) {
    const numericId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    return this.coursesService.remove(numericId);
  }
}
