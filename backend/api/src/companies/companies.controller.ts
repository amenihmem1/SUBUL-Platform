import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Companies')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies with pagination' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of companies' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companiesService.findAll(status, search, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create company' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, description: 'Company created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', type: String, description: 'Company UUID' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  @ApiParam({ name: 'id', type: String, description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.companiesService.remove(id);
    return { deleted: true };
  }

  @Patch(':companyId/employees/:employeeId/status')
  @ApiOperation({ summary: 'Update employee status' })
  @ApiParam({ name: 'companyId', type: String, description: 'Company UUID' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', example: 'active' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Employee status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'Company or employee not found' })
  updateEmployeeStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() body: { status: string },
  ) {
    return this.companiesService.updateEmployeeStatus(companyId, employeeId, body.status);
  }

  @Post(':companyId/employees')
  @ApiOperation({ summary: 'Add employee to company' })
  @ApiParam({ name: 'companyId', type: String, description: 'Company UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        position: { type: 'string', example: 'Developer' },
      },
      required: ['name', 'email', 'position'],
    },
  })
  @ApiResponse({ status: 201, description: 'Employee added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  addEmployee(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() body: { name: string; email: string; position: string },
  ) {
    return this.companiesService.addEmployee(companyId, body);
  }
}
