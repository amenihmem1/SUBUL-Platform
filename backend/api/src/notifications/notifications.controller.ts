import { Controller, Get, Patch, Param, UseGuards, Req, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Notifications')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'Return notifications for current user' })
  getUserNotifications(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get admin notifications' })
  @ApiResponse({ status: 200, description: 'Return admin notifications' })
  getAdminNotifications() {
    return this.notificationsService.getAdminNotifications();
  }

  @Get('employer')
  @ApiOperation({ summary: 'Get employer notifications' })
  @ApiResponse({ status: 200, description: 'Return employer notifications' })
  getEmployerNotifications(@Req() req: any) {
    // Assuming req.user has the employerId or we can use req.user.id
    const employerId = req.user.id;
    return this.notificationsService.getEmployerNotifications(employerId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
