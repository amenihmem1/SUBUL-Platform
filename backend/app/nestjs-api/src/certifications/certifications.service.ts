import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Certification } from './entities/certification.entity';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';

@Injectable()
export class CertificationsService {
  constructor(
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
  ) {}

  async findAll(query: {
    search?: string;
    status?: 'Active' | 'Draft' | 'Archived';
    provider?: string;
  }): Promise<Certification[]> {
    const { search, status, provider } = query;
    const where: any = {};

    if (search) {
      where.title = Like(`%${search}%`);
    }
    if (status) {
      where.status = status;
    }
    if (provider) {
      where.provider = provider;
    }

    return this.certificationRepository.find({ where });
  }

  async create(createCertificationDto: CreateCertificationDto): Promise<Certification> {
    const certification = this.certificationRepository.create(createCertificationDto);
    return this.certificationRepository.save(certification);
  }

  async findOne(id: number): Promise<Certification> {
    const certification = await this.certificationRepository.findOneBy({ id });
    if (!certification) {
      throw new NotFoundException(`Certification with ID ${id} not found`);
    }
    return certification;
  }

  async update(id: number, updateCertificationDto: UpdateCertificationDto): Promise<Certification> {
    const certification = await this.findOne(id);
    Object.assign(certification, updateCertificationDto);
    return this.certificationRepository.save(certification);
  }

  async remove(id: number): Promise<{ message: string }> {
    const certification = await this.findOne(id);
    await this.certificationRepository.remove(certification);
    return { message: 'Certification supprimée' };
  }

  async toggleAvailability(id: number, toggleAvailabilityDto: ToggleAvailabilityDto): Promise<Certification> {
    const certification = await this.findOne(id);
    certification.available = toggleAvailabilityDto.available;
    return this.certificationRepository.save(certification);
  }
}