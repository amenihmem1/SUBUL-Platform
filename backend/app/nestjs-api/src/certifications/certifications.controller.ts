import { Controller, Get, Post, Body, Put, Param, Delete, Patch, Query, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { RolesGuard } from '../auth/guards/roles.guard';

// @UseGuards(RolesGuard)
@Controller('api/admin/certifications')
export class CertificationsController {
  constructor(private readonly certificationsService: CertificationsService) {}

  @Get()
  // @Roles('admin')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: 'Active' | 'Draft' | 'Archived',
    @Query('provider') provider?: string,
  ) {
    return this.certificationsService.findAll({ search, status, provider });
  }

  @Post()
  // @Roles('admin')
  create(@Body() createCertificationDto: CreateCertificationDto) {
    return this.certificationsService.create(createCertificationDto);
  }

  @Put(':id')
  // @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCertificationDto: UpdateCertificationDto) {
    return this.certificationsService.update(id, updateCertificationDto);
  }

  @Delete(':id')
  // @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.certificationsService.remove(id);
  }

  @Patch(':id/availability')
  // @Roles('admin')
  toggleAvailability(@Param('id', ParseIntPipe) id: number, @Body() toggleAvailabilityDto: ToggleAvailabilityDto) {
    return this.certificationsService.toggleAvailability(id, toggleAvailabilityDto);
  }
}