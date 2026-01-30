// src/admin/admin.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Admin, Prisma } from '../generated/prisma/client.js';
import { AdminUserSearchDto } from './dto/admin-user-search.dto.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export type UserSortField = 'name' | 'email' | 'createdAt' | 'lastLoginAt';
export type SortOrder = 'asc' | 'desc';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.admin.create({
      data,
    });
  }

  async updateAdmin(params: {
    where: Prisma.AdminWhereUniqueInput;
    data: Prisma.AdminUpdateInput;
  }): Promise<Admin> {
    const { where, data } = params;
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

  async getRecentUsers(limit = 5) {
    const users = await this.prisma.user.findMany({
      take: limit,
      orderBy: {
        lastLoginAt: 'desc',
      },
      where: {
        lastLoginAt: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        lastLoginAt: true,
        business: {
          select: {
            name: true,
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      businessName: user.business?.name,
    }));
  }

  async getAllUsers() {
  const users = await this.prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      userType: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      business: {
        select: {
          name: true,
        },
      },
    },
  });

  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    businessName: user.business?.name,
  }));
}

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    userType?: string;
    sortBy?: UserSortField;
    sortOrder?: SortOrder;
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      userType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        {
          business: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (userType) {
      where.userType = userType;
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          userType: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          business: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        businessName: user.business?.name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        business: {
          select: {
            name: true,
            id: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async searchUsers(dto: AdminUserSearchDto) {
    const { q, type } = dto;

    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {
      AND: [],
    };

    if (q) {
      where.AND.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          {
            business: {
              name: { contains: q, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (type) {
      where.AND.push({
        userType: type,
      });
    }

    if (!where.AND.length) {
      delete where.AND;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          userType: true,
          status: true,
          lastLoginAt: true,
          business: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        userType: u.userType,
        accountStatus: u.status,
        lastLoginAt: u.lastLoginAt,
        businessName: u.business?.name ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async forcePasswordReset(userId: string, adminId: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
      },
    });

    // await this.logAudit(adminId, 'RESET_PASSWORD', userId);

    /**
     * IMPORTANT:
     * Send rawToken via email/SMS
     * NEVER store or return it again
     */
    return { success: true };
  }

  async changeEmail(userId: string, email: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });

    // await this.logAudit(adminId, 'CHANGE_EMAIL', userId, { email });

    return { success: true };
  }

  async changePhone(userId: string, phone: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone },
    });

    // await this.logAudit(adminId, 'CHANGE_PHONE', userId, { phone });

    return { success: true };
  }

  async changeStatus(
    userId: string,
    status: string, // Accept string first
    adminId: string,
  ) {
    // Validate status before calling Prisma
    const validStatuses = ['ACTIVE', 'DISABLED'];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status: '${status}'. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Now TypeScript knows status is valid
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as 'ACTIVE' | 'DISABLED' },
    });

    return { success: true };
  }
}
