/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import bcrypt from 'bcryptjs';

export type UserSortField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'username'
  | 'createdAt'
  | 'updatedAt'
  | 'lastLogin';

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

    // Build orderBy based on sort field
    let orderBy: Prisma.UserOrderByWithRelationInput = {};

    // Handle lastLogin separately since it's from a relation
    if (sortBy === 'lastLogin') {
      // We'll need to sort in memory or use a subquery for proper sorting
      // For now, default to createdAt
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

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

          // Get the most recent refresh token for last login info
          refreshTokens: {
            select: {
              lastLogin: true,
              userAgent: true,
              device: true,
              ipAddress: true,
              city: true,
              country: true,
            },
            take: 1,
            orderBy: {
              lastLogin: 'desc',
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Transform results to include last login info
    const userData = users.map((user) => {
      const lastRefreshToken = user.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.isBanned ? ('BANNED' as const) : ('ACTIVE' as const),
        banDate: user.banDate,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
        createdAt: user.createdAt,
        businessName: user.businessClients[0]?.business?.name || null,
        userType: 'consumer',
      };
    });

    // If sorting by lastLogin, sort in memory
    let sortedData = userData;
    if (sortBy === 'lastLogin') {
      sortedData = [...userData].sort((a, b) => {
        const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;

        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }

    return {
      data: sortedData,
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
        // Get last login info
        refreshTokens: {
          select: {
            lastLogin: true,
            device: true,
            ipAddress: true,
            city: true,
            country: true,
          },
          take: 1,
          orderBy: {
            lastLogin: 'desc',
          },
        },
      },
    });

    return users.map((user) => {
      const lastRefreshToken = user.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.isBanned ? 'BANNED' : 'ACTIVE',
        banDate: user.banDate,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        businessName: user.businessClients[0]?.business?.name || null,
        createdAt: user.createdAt,
        userType: 'consumer',
      };
    });
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
        // Get last login info
        refreshTokens: {
          select: {
            lastLogin: true,
            device: true,
            ipAddress: true,
            city: true,
            country: true,
          },
          take: 1,
          orderBy: {
            lastLogin: 'desc',
          },
        },
      },
    });

    return users.map((user) => {
      const lastRefreshToken = user.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.isBanned ? 'BANNED' : 'ACTIVE',
        banDate: user.banDate,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
        createdAt: user.createdAt,
        businessName: user.businessClients[0]?.business?.name || null,
        userType: 'consumer',
      };
    });
  }

  // Get user by ID (regular user) - Already includes last login
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
            ipAddress: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
            regionName: true,
            timezone: true,
          },
          take: 5, // Get last 5 login sessions
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
    const lastLoginAt = lastLoginToken?.lastLogin;

    return {
      ...user,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      userType: 'consumer',
      lastLoginAt: lastLoginAt,
      lastLoginDevice: lastLoginToken?.device,
      lastLoginIp: lastLoginToken?.ipAddress,
      lastLoginLocation:
        lastLoginToken?.city || lastLoginToken?.country
          ? `${lastLoginToken.city || ''}${lastLoginToken.city && lastLoginToken.country ? ', ' : ''}${lastLoginToken.country || ''}`
          : null,
      // Include all recent login sessions
      recentLoginSessions: user.refreshTokens.map((token) => ({
        lastLogin: token.lastLogin,
        device: token.device,
        userAgent: token.userAgent,
        ipAddress: token.ipAddress,
        location:
          token.city || token.country
            ? `${token.city || ''}${token.city && token.country ? ', ' : ''}${token.country || ''}`
            : null,
        coordinates:
          token.latitude && token.longitude
            ? { latitude: token.latitude, longitude: token.longitude }
            : null,
        timezone: token.timezone,
        region: token.regionName,
      })),
    };
  }

  async resetUserPasswordSimple(
    userId: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Basic password check
      if (!newPassword || newPassword.length < 6) {
        throw new BadRequestException(
          'Password must be at least 6 characters long',
        );
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return {
        success: true,
        message: 'Password successfully reset',
      };
    } catch (error) {
      this.logger.error(
        `Failed to reset password for user ${userId}: ${error.message}`,
      );
      throw error;
    }
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

  // New method: Get user login history
  async getUserLoginHistory(userId: string, limit = 10) {
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        lastLogin: true,
        userAgent: true,
        device: true,
        ipAddress: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        regionName: true,
        timezone: true,
        createdAt: true,
      },
      orderBy: {
        lastLogin: 'desc',
      },
      take: limit,
    });

    return refreshTokens.map((token) => ({
      id: token.id,
      lastLogin: token.lastLogin,
      device: token.device,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      location:
        token.city || token.country
          ? `${token.city || ''}${token.city && token.country ? ', ' : ''}${token.country || ''}`
          : null,
      coordinates:
        token.latitude && token.longitude
          ? { latitude: token.latitude, longitude: token.longitude }
          : null,
      region: token.regionName,
      timezone: token.timezone,
      sessionStart: token.createdAt,
    }));
  }
}
