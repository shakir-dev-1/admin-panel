/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/admin/admin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Admin } from '../generated/prisma/client.js';
// import { AdminUserSearchDto } from './dto/admin-user-search.dto.js';
import * as bcrypt from 'bcrypt';

// Define these based on your needs if not already imported
// type UserSortField = keyof Prisma.UserOrderByWithRelationInput;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  // Admin CRUD operations
  async admin(
    adminWhereUniqueInput: Prisma.AdminWhereUniqueInput,
  ): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: adminWhereUniqueInput,
    });
  }

  async admins(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AdminWhereUniqueInput;
    where?: Prisma.AdminWhereInput;
    orderBy?: Prisma.AdminOrderByWithRelationInput;
  }): Promise<Admin[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.admin.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createAdmin(data: Prisma.AdminCreateInput): Promise<Admin> {
    // Hash password before creating admin
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async updateAdmin(params: {
    where: Prisma.AdminWhereUniqueInput;
    data: Prisma.AdminUpdateInput;
  }): Promise<Admin> {
    const { where, data } = params;

    // Hash password if it's being updated
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }

    return this.prisma.admin.update({
      data,
      where,
    });
  }

  async deleteAdmin(where: Prisma.AdminWhereUniqueInput): Promise<Admin> {
    return this.prisma.admin.delete({
      where,
    });
  }

  // Audit logging
  async logAudit(
    adminId: string,
    actionType: string,
    targetUserId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId,
        actionType,
        targetUserId,
        metadata,
      },
    });
  }

  // Get system statistics
  async getSystemStatistics() {
    const [
      totalRegularUsers,
      totalBusinessUsers,
      totalBusinesses,
      totalActiveAppointments,
      totalCompletedAppointments,
      totalRevenue,
      newUsersLast7Days,
      newBusinessUsersLast7Days,
      newBusinessesLast7Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.businessUser.count(),
      this.prisma.business.count(),
      this.prisma.appointment.count({
        where: {
          status: {
            in: ['CREATED', 'CONFIRMED', 'CHECKED_IN'],
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'COMPLETED',
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: {
          amountSent: true,
        },
        where: {
          transactionStatus: 'PAID',
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.businessUser.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.business.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      users: {
        totalRegularUsers,
        totalBusinessUsers,
        newUsersLast7Days,
        newBusinessUsersLast7Days,
      },
      businesses: {
        totalBusinesses,
        newBusinessesLast7Days,
      },
      appointments: {
        totalActive: totalActiveAppointments,
        totalCompleted: totalCompletedAppointments,
      },
      revenue: {
        total: totalRevenue._sum.amountSent || 0,
      },
    };
  }
}
