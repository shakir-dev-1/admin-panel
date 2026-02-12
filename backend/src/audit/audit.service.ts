import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

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

// Define the admin type for the relation
interface AdminUser {
  id: string;
  email: string;
}

// Define the return type with proper relations
interface AdminAuditLogWithRelations {
  id: string;
  actionType: string;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
  adminId: string | null;
  targetUserId: string | null;
  admin: AdminUser | null;
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

    // Build where clause with proper Prisma types
    const where: Prisma.AdminAuditLogWhereInput = {};

    if (search) {
      where.OR = [
        {
          admin: {
            email: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          actionType: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
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

    // Get paginated data with proper typing
    const logs =
      await this.prisma.adminAuditLog.findMany<Prisma.AdminAuditLogFindManyArgs>(
        {
          where,
          include: {
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        },
      );

    // If we need user information, we need to fetch it separately
    const targetUserIds = logs
      .map((log) => log.targetUserId)
      .filter((id): id is string => id !== null);

    let users: Record<
      string,
      { id: string; email: string; name: string | null }
    > = {};

    if (targetUserIds.length > 0) {
      const fetchedUsers = await this.prisma.user.findMany({
        where: {
          id: {
            in: targetUserIds,
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      users = fetchedUsers.reduce(
        (acc, user) => {
          acc[user.id] = {
            id: user.id,
            email: user.email,
            name:
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`.trim()
                : user.email,
          };
          return acc;
        },
        {} as Record<string, any>,
      );
    }

    // Format the response with proper typing
    const formattedLogs = (logs as AdminAuditLogWithRelations[]).map((log) => ({
      id: log.id,
      actionType: log.actionType,
      createdAt: log.createdAt,
      admin: log.admin
        ? {
            id: log.admin.id,
            email: log.admin.email,
          }
        : null,
      targetUser:
        log.targetUserId && users[log.targetUserId]
          ? users[log.targetUserId]
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

        // Top 5 action types - with proper typing
        this.prisma.adminAuditLog.groupBy({
          by: ['actionType'],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        }),

        // Top 5 admins by actions - with proper typing
        this.prisma.adminAuditLog.groupBy({
          by: ['adminId'],
          _count: {
            id: true,
          },
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

    // Enrich admin data with proper typing
    const enrichedTopAdmins = await Promise.all(
      topAdmins
        .filter(
          (admin): admin is { adminId: string; _count: { id: number } } =>
            admin.adminId !== null,
        )
        .map(async (admin) => {
          const adminData = await this.prisma.admin.findUnique({
            where: { id: admin.adminId },
            select: { email: true },
          });
          return {
            adminId: admin.adminId,
            adminEmail: adminData?.email || 'Unknown',
            count: admin._count.id,
          };
        }),
    );

    return {
      totalLogs,
      logsLast30Days,
      topActions: topActions.map((action) => ({
        actionType: action.actionType,
        count: action._count.id,
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
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
