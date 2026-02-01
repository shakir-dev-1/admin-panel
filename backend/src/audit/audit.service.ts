import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  actionType?: string;
  adminId?: string;
  targetUserId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogResponse> {
    const {
      page = 1,
      limit = 50,
      search,
      actionType,
      adminId,
      targetUserId,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        {
          admin: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          targetUser: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        {
          actionType: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (actionType) {
      where.actionType = actionType;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await this.prisma.adminAuditLog.count({ where });

    // Get paginated data
    const logs = await this.prisma.adminAuditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Format the response
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      actionType: log.actionType,
      createdAt: log.createdAt,
      admin: log.admin
        ? {
            id: log.admin.id,
            email: log.admin.email,
          }
        : null,
      targetUser: log.targetUser
        ? {
            id: log.targetUser.id,
            name: log.targetUser.name,
            email: log.targetUser.email,
            userType: log.targetUser.userType,
          }
        : null,
      metadata: log.metadata,
    }));

    return {
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditSummary() {
    // Get stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalLogs, logsLast30Days, topActions, topAdmins] =
      await Promise.all([
        // Total logs
        this.prisma.adminAuditLog.count(),

        // Logs in last 30 days
        this.prisma.adminAuditLog.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),

        // Top 5 action types
        this.prisma.adminAuditLog.groupBy({
          by: ['actionType'],
          _count: true,
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        }),

        // Top 5 admins by actions
        this.prisma.adminAuditLog.groupBy({
          by: ['adminId'],
          _count: true,
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
          where: {
            adminId: {
              not: null,
            },
          },
        }),
      ]);

    // Enrich admin data
    const enrichedTopAdmins = await Promise.all(
      topAdmins
        .filter((admin) => admin.adminId !== null)
        .map(async (admin) => {
          const adminData = await this.prisma.admin.findUnique({
            where: { id: admin.adminId as string },
            select: { email: true },
          });
          return {
            adminId: admin.adminId,
            adminEmail: adminData?.email || 'Unknown',
            count: admin._count,
          };
        }),
    );

    return {
      totalLogs,
      logsLast30Days,
      topActions: topActions.map((action) => ({
        actionType: action.actionType,
        count: action._count,
      })),
      topAdmins: enrichedTopAdmins,
    };
  }

  async log(params: {
    adminId: string;
    actionType: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        actionType: params.actionType,
        targetUserId: params.targetUserId,
        metadata: params.metadata,
      },
    });
  }
}
