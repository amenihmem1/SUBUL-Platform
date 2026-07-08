import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Job } from '../jobs/entities/job.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async notifyAdmin(type: string, job: Job, title: string, message: string) {
    const notification = this.notificationsRepository.create({
      recipientRole: 'admin',
      type,
      title,
      message,
      jobId: job.id,
    } as any);
    const saved = await this.notificationsRepository.save(notification as any);
    this.notificationsGateway.sendToAdmins(saved);
    return saved;
  }

  async notifyByEmployer(type: string, employerId: number, jobId: string, title: string, message: string) {
    const notification = this.notificationsRepository.create({
      recipientId: employerId,
      type,
      title,
      message,
      jobId,
    } as any);
    const saved = await this.notificationsRepository.save(notification as any);
    this.notificationsGateway.sendToUser(employerId, saved);
    return saved;
  }

  async getAdminNotifications() {
    return this.notificationsRepository.find({
      where: { recipientRole: 'admin' },
      order: { createdAt: 'DESC' },
    });
  }

  async getEmployerNotifications(employerId: number) {
    return this.notificationsRepository.find({
      where: { recipientId: employerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserNotifications(userId: number) {
    return this.notificationsRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId?: number) {
    const where: any = { id };
    if (userId) where.recipientId = userId;
    await this.notificationsRepository.update(where, { isRead: true });
    return this.notificationsRepository.findOne({ where: { id } });
  }
}
