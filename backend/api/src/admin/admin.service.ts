import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { USER_ROLES, USER_STATUS } from '../common/constants';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async getLearnersProgression() {
    return this.usersService.getLearnersProgression();
  }

  async getSystemStats() {
    const [row] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "totalUsers",
         COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(status, ''))) = $1)::int AS "activeUsers",
         COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(status, ''))) = $2)::int AS "pendingUsers",
         COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(role, ''))) = $3)::int AS "adminUsers",
         COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(role, ''))) = $4)::int AS "employerUsers"
       FROM users`,
      [
        USER_STATUS.ACTIVE,
        USER_STATUS.PENDING,
        USER_ROLES.ADMIN,
        USER_ROLES.EMPLOYER,
      ],
    );

    const totalUsers = Number(row?.totalUsers ?? 0);
    const activeUsers = Number(row?.activeUsers ?? 0);
    const pendingUsers = Number(row?.pendingUsers ?? 0);
    const adminUsers = Number(row?.adminUsers ?? 0);
    const employerUsers = Number(row?.employerUsers ?? 0);

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      adminUsers,
      employerUsers,
      monthlyRevenue: '0',
    };
  }

  async getAnalyticsOverview(): Promise<{
    activeUsers: number;
    coursesCompleted: number;
    revenue: string;
    completionRate: number;
    totalUsers: number;
    newSignups?: number;
    topCourses?: { name: string; students: number; completion: number; revenue: string }[];
    revenueData?: { month: string; value: number }[];
  }> {
    const stats = await this.getSystemStats();
    const progression = await this.getLearnersProgression();
    const list = Array.isArray(progression) ? progression : [];
    let coursesCompleted = 0;
    let totalEnrollments = 0;
    for (const learner of list) {
      const courses = (learner as any).courses ?? [];
      totalEnrollments += courses.length;
      coursesCompleted += courses.filter((c: any) => c.status === 'completed').length;
    }
    const completionRate =
      totalEnrollments > 0 ? Math.round((coursesCompleted / totalEnrollments) * 1000) / 10 : 0;
    return {
      activeUsers: stats.activeUsers,
      coursesCompleted,
      revenue: stats.monthlyRevenue ?? '0',
      completionRate,
      totalUsers: stats.totalUsers,
      newSignups: 0,
      topCourses: [],
      revenueData: [],
    };
  }

  async getOverview() {
    const ym = new Date().toISOString().slice(0, 7);
    const [usersByRole] = await Promise.all([
      this.dataSource.query(
        `SELECT LOWER(TRIM(COALESCE(role,''))) AS role, COUNT(*)::int AS count FROM users GROUP BY LOWER(TRIM(COALESCE(role,'')))`,
      ),
    ]);
    const pendingUsers = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE LOWER(COALESCE(status,'')) = 'pending'`,
    );
    const jobsByStatus = await this.dataSource.query(
      `SELECT LOWER(COALESCE(status,'')) AS status, COUNT(*)::int AS count FROM jobs GROUP BY LOWER(COALESCE(status,''))`,
    );
    const [uniCount] = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM universities`);
    const [subCount] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c FROM user_subscriptions WHERE LOWER(subscription_status) = 'active'`,
    );
    const topAgentUsage = await this.dataSource.query(
      `SELECT u.email, a.user_id AS "userId", a.agent_key AS "agentKey", a.count
       FROM agent_usage_monthly a JOIN users u ON u.id = a.user_id
       WHERE a.year_month = $1 ORDER BY a.count DESC LIMIT 15`,
      [ym],
    );
    const recentSignups = await this.dataSource.query(
      `SELECT id, email, fullname AS "fullName", role, created_at AS "createdAt" FROM users ORDER BY created_at DESC LIMIT 10`,
    );
    const recentJobs = await this.dataSource.query(
      `SELECT j.id, j.title, j.status, j.created_at AS "createdAt", c.name AS "companyName"
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id ORDER BY j.created_at DESC LIMIT 10`,
    );
    return {
      usersByRole,
      pendingUsers: pendingUsers[0]?.c ?? 0,
      jobsByStatus,
      universitiesCount: uniCount?.c ?? 0,
      activeSubscriptions: subCount?.c ?? 0,
      agentUsageMonth: ym,
      topAgentUsage,
      recentSignups,
      recentJobs,
    };
  }

  /**
   * Auth / growth metrics for admin dashboard (verification, subscriptions, signups, password-reset volume).
   */
  async getAuthStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    verificationRatePercent: number;
    activeSubscriptions: number;
    trialUsers: number;
    expiredSubscriptions: number;
    signupsOverTime: { date: string; count: number }[];
    verificationRateTrend: { date: string; ratePercent: number }[];
    passwordResetRequestsOverTime: { date: string; count: number }[];
    usersByRole: { role: string; count: number }[];
  }> {
    const [totals] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "totalUsers",
         COUNT(*) FILTER (WHERE is_email_verified = true)::int AS "verifiedUsers",
         COUNT(*) FILTER (WHERE is_email_verified = false)::int AS "unverifiedUsers"
       FROM users`,
    );
    const totalUsers = Number(totals?.totalUsers ?? 0);
    const verifiedUsers = Number(totals?.verifiedUsers ?? 0);
    const unverifiedUsers = Number(totals?.unverifiedUsers ?? 0);
    const verificationRatePercent =
      totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 1000) / 10 : 0;

    const [subRow] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE LOWER(subscription_status) = 'active')::int AS "activeSubscriptions",
         COUNT(*) FILTER (WHERE LOWER(subscription_status) = 'trial')::int AS "trialUsers",
         COUNT(*) FILTER (WHERE LOWER(subscription_status) = 'expired')::int AS "expiredSubscriptions"
       FROM user_subscriptions`,
    );

    const signupsOverTime = await this.dataSource.query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
              COUNT(*)::int AS count
       FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1 ASC`,
    );

    const verifiedByDay = await this.dataSource.query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_email_verified = true)::int AS verified
       FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1 ASC`,
    );

    const verificationRateTrend = verifiedByDay.map((row: { date: string; total: number; verified: number }) => ({
      date: row.date,
      ratePercent:
        row.total > 0 ? Math.round((row.verified / row.total) * 1000) / 10 : 0,
    }));

    let passwordResetRequestsOverTime: { date: string; count: number }[] = [];
    try {
      passwordResetRequestsOverTime = await this.dataSource.query(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                COUNT(*)::int AS count
         FROM password_reset_request_log
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY 1 ASC`,
      );
    } catch {
      passwordResetRequestsOverTime = [];
    }

    const usersByRole = await this.dataSource.query(
      `SELECT COALESCE(LOWER(TRIM(role)), 'unknown') AS role, COUNT(*)::int AS count
       FROM users GROUP BY 1 ORDER BY count DESC`,
    );

    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      verificationRatePercent,
      activeSubscriptions: Number(subRow?.activeSubscriptions ?? 0),
      trialUsers: Number(subRow?.trialUsers ?? 0),
      expiredSubscriptions: Number(subRow?.expiredSubscriptions ?? 0),
      signupsOverTime,
      verificationRateTrend,
      passwordResetRequestsOverTime,
      usersByRole,
    };
  }
}
