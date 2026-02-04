/* eslint-disable @typescript-eslint/no-unused-vars */
// src/admin/admin.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
// import { AdminUserSearchDto } from './dto/admin-user-search.dto.js';
import * as crypto from 'crypto';

export type UserSortField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'username'
  | 'createdAt'
  | 'updatedAt';

export type SortOrder = 'asc' | 'desc';

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  // Get regular users with pagination and filters
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'BANNED';
    sortBy?: UserSortField;
    sortOrder?: SortOrder;
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        {
          businessClients: {
            some: {
              business: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    if (status === 'BANNED') {
      where.isBanned = true;
    } else if (status === 'ACTIVE') {
      where.isBanned = false;
    }

    // We use the specific OrderBy input type from Prisma
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          phoneNumber: true,
          isBanned: true,
          banDate: true,
          createdAt: true,
          updatedAt: true,
          businessClients: {
            take: 1,
            select: {
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.isBanned ? ('BANNED' as const) : ('ACTIVE' as const),
        banDate: user.banDate,
        lastLoginAt: user.updatedAt,
        createdAt: user.createdAt,
        businessName: user.businessClients[0]?.business?.name || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get recent regular users
  async getRecentUsers(limit = 5) {
    const users = await this.prisma.user.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        phoneNumber: true,
        isBanned: true,
        banDate: true,
        createdAt: true,
        updatedAt: true,
        // Get the first business they're associated with (if any)
        businessClients: {
          take: 1,
          select: {
            business: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      status: user.isBanned ? 'BANNED' : 'ACTIVE',
      banDate: user.banDate,
      lastLoginAt: user.updatedAt, // Using updatedAt as proxy for last activity
      businessName: user.businessClients[0]?.business?.name || null,
      createdAt: user.createdAt,
    }));
  }

  // Get all regular users
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        phoneNumber: true,
        isBanned: true,
        banDate: true,
        createdAt: true,
        updatedAt: true,
        businessClients: {
          take: 1,
          select: {
            business: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      status: user.isBanned ? 'BANNED' : 'ACTIVE',
      banDate: user.banDate,
      lastLoginAt: user.updatedAt,
      createdAt: user.createdAt,
      businessName: user.businessClients[0]?.business?.name || null,
    }));
  }

  // Get user by ID (regular user)
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        email: true,
        username: true,
        phoneNumber: true,
        avatarId: true,
        profilePicture: true,
        isAgreementAccepted: true,
        isEmailConfirmed: true,
        isPhoneConfirmed: true,
        twoFactorEnabled: true,
        onboardingCompleted: true,
        hasAcceptedPolicy: true,
        twoFactorType: true,
        isBanned: true,
        banDate: true,
        createdAt: true,
        updatedAt: true,
        clerkUserId: true,
        avatar: true,
        userSettings: true,
        favorites: {
          select: {
            id: true,
            name: true,
          },
        },
        businessClients: {
          select: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reviews: {
          select: {
            id: true,
            ratings: true,
            business: {
              select: {
                name: true,
              },
            },
            createdAt: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
        refreshTokens: {
          select: {
            lastLogin: true,
            userAgent: true,
            device: true,
          },
          take: 1,
          orderBy: {
            lastLogin: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lastLoginToken = user.refreshTokens[0];

    return {
      ...user,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      lastLoginAt: lastLoginToken?.lastLogin || user.updatedAt,
      lastLoginDevice: lastLoginToken?.device,
    };
  }

  // Force password reset for regular user
  async forcePasswordReset(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token (you might want to implement a PasswordResetToken model)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Note: You need to create a PasswordResetToken model or use your existing method
    // await this.prisma.passwordResetToken.create({
    //   data: {
    //     userId,
    //     tokenHash,
    //     expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    //   },
    // });

    // await this.logAudit(adminId, 'RESET_PASSWORD', userId, {
    //   action: 'password_reset_forced',
    // });

    // IMPORTANT: Send rawToken via email/SMS
    return { success: true, token: rawToken }; // In production, don't return token, send via email
  }

  // Change email for regular user
  async changeEmail(userId: string, email: string) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Email already in use');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email, isEmailConfirmed: false }, // Reset email confirmation
    });

    // await this.logAudit(adminId, 'CHANGE_EMAIL', userId, { email });

    return { success: true };
  }

  // Change phone for regular user
  async changePhone(userId: string, phone: string) {
    // Check if phone already exists using findFirst
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phoneNumber: phone,
        NOT: { id: userId }, // Exclude current user
      },
    });

    if (existingUser) {
      throw new BadRequestException('Phone number already in use');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: phone, isPhoneConfirmed: false },
    });

    return { success: true };
  }

  // Change status (ban/unban) for regular user
  async changeStatus(userId: string, isBanned: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        banDate: isBanned ? new Date() : null,
      },
    });

    // await this.logAudit(adminId, isBanned ? 'BAN_USER' : 'UNBAN_USER', userId, {
    //   isBanned,
    //   banDate: isBanned ? new Date() : null,
    // });

    return { success: true };
  }
}
