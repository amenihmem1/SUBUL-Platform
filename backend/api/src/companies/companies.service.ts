import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findAll(
    status?: string,
    search?: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ data: Company[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const query = this.companyRepository.createQueryBuilder('company');
    if (status) query.andWhere('company.status = :status', { status });
    if (search) {
      const s = `%${search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(company.name) LIKE :s OR LOWER(company.email) LIKE :s OR LOWER(company.sector) LIKE :s)',
        { s }
      );
    }
    query.orderBy('company.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company #${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto, ownerId?: number): Promise<Company> {
    const defaultData = {
      name: dto.name || 'Untitled Company',
      email: dto.email || null,
      sector: dto.sector || null,
      status: dto.status || 'pending',
      logo: dto.logo || null,
      description: dto.description || null,
      location: dto.location || null,
      website: dto.website || null,
      employees: [],
      publications: [],
    };
    const company = this.companyRepository.create({ ...defaultData, ownerId } as any);
    return this.companyRepository.save(company as any);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companyRepository.save(company as any);
  }

  async remove(id: string): Promise<void> {
    const result = await this.companyRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Company #${id} not found`);
  }

  async updateEmployeeStatus(
    companyId: string,
    employeeId: number,
    status: string,
  ) {
    const company = await this.findOne(companyId);
    let found = false;
    let updatedEmp = null;
    company.employees = company.employees.map((emp: any) => {
      if (emp.id === employeeId) {
        emp.status = status;
        found = true;
        updatedEmp = emp;
      }
      return emp;
    });
    if (!found) throw new NotFoundException(`Employee #${employeeId} not found`);
    await this.companyRepository.save(company as any);
    return updatedEmp;
  }

  async addEmployee(
    companyId: string,
    data: { name: string; email: string; position: string },
  ) {
    const company = await this.findOne(companyId);
    const newEmployee = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      position: data.position || null,
      status: 'pending',
      requestDate: new Date().toISOString(),
    };
    company.employees.push(newEmployee);
    await this.companyRepository.save(company as any);
    return newEmployee;
  }

  async findByOwner(ownerId: number): Promise<Company | null> {
    return this.companyRepository.findOne({ where: { ownerId } });
  }
}
