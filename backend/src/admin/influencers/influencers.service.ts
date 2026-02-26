/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/admin/influencers.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CampaignOfferStatus, Prisma } from '../../generated/prisma/client.js';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

export type InfluencerSortField =
  | 'name'
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
export class InfluencersService {
  private readonly logger = new Logger(InfluencersService.name);
  constructor(private prisma: PrismaService) {}

  // Get influencers with pagination and filters
  async getInfluencers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    sortBy?: InfluencerSortField;
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

    const where: Prisma.InfluencerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (status === 'INACTIVE') {
      where.isEmailConfirmed = false;
    } else if (status === 'ACTIVE') {
      where.isEmailConfirmed = true;
    }

    // Build orderBy based on sort field
    let orderBy: Prisma.InfluencerOrderByWithRelationInput = {};

    // Handle lastLogin separately since it's from a relation
    if (sortBy === 'lastLogin') {
      // We'll sort in memory
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [influencers, total] = await Promise.all([
      this.prisma.influencer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phoneNumber: true,
          isEmailConfirmed: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          // Get campaign offers count
          campaignOffers: {
            select: {
              id: true,
              status: true,
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
      this.prisma.influencer.count({ where }),
    ]);

    // Transform results to include stats and last login info
    const influencerData = influencers.map((influencer) => {
      const lastRefreshToken = influencer.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      const campaignOffers = influencer.campaignOffers || [];
      const totalOffers = campaignOffers.length;
      const acceptedOffers = campaignOffers.filter(
        (co) => co.status === 'ACCEPTED',
      ).length;
      const pendingOffers = campaignOffers.filter(
        (co) => co.status === 'PENDING',
      ).length;

      return {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        username: influencer.username,
        phoneNumber: influencer.phoneNumber,
        status: influencer.isEmailConfirmed
          ? ('ACTIVE' as const)
          : ('INACTIVE' as const),
        twoFactorEnabled: influencer.twoFactorEnabled,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
        campaignStats: {
          totalOffers,
          acceptedOffers,
          pendingOffers,
          rejectedOffers: totalOffers - acceptedOffers - pendingOffers,
        },
        userType: 'influencer',
      };
    });

    // If sorting by lastLogin, sort in memory
    let sortedData = influencerData;
    if (sortBy === 'lastLogin') {
      sortedData = [...influencerData].sort((a, b) => {
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

  // Get recent influencers
  async getRecentInfluencers(limit = 5) {
    const influencers = await this.prisma.influencer.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phoneNumber: true,
        isEmailConfirmed: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        campaignOffers: {
          select: {
            id: true,
            status: true,
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

    return influencers.map((influencer) => {
      const lastRefreshToken = influencer.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      const campaignOffers = influencer.campaignOffers || [];
      const totalOffers = campaignOffers.length;
      const acceptedOffers = campaignOffers.filter(
        (co) => co.status === 'ACCEPTED',
      ).length;

      return {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        username: influencer.username,
        phoneNumber: influencer.phoneNumber,
        status: influencer.isEmailConfirmed ? 'ACTIVE' : 'INACTIVE',
        twoFactorEnabled: influencer.twoFactorEnabled,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        createdAt: influencer.createdAt,
        campaignStats: {
          totalOffers,
          acceptedOffers,
          acceptanceRate:
            totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0,
        },
        userType: 'influencer',
      };
    });
  }

  // Get all influencers
  async getAllInfluencers() {
    const influencers = await this.prisma.influencer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phoneNumber: true,
        isEmailConfirmed: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        campaignOffers: {
          select: {
            id: true,
            status: true,
            business: {
              select: {
                name: true,
              },
            },
            campaign: {
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

    return influencers.map((influencer) => {
      const lastRefreshToken = influencer.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        username: influencer.username,
        phoneNumber: influencer.phoneNumber,
        status: influencer.isEmailConfirmed ? 'ACTIVE' : 'INACTIVE',
        twoFactorEnabled: influencer.twoFactorEnabled,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
        createdAt: influencer.createdAt,
        campaignOffers: influencer.campaignOffers,
        userType: 'influencer',
      };
    });
  }

  // Get influencer by ID
  async getInfluencerById(influencerId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phoneNumber: true,
        isEmailConfirmed: true,
        twoFactorEnabled: true,
        twoFactorType: true,
        createdAt: true,
        updatedAt: true,
        campaignOffers: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            business: {
              select: {
                id: true,
                name: true,
              },
            },
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
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

    if (!influencer) {
      throw new NotFoundException('Influencer not found');
    }

    const lastLoginToken = influencer.refreshTokens[0];
    const lastLoginAt = lastLoginToken?.lastLogin;

    const campaignOffers = influencer.campaignOffers || [];
    const totalOffers = campaignOffers.length;
    const acceptedOffers = campaignOffers.filter(
      (co) => co.status === 'ACCEPTED',
    ).length;
    const pendingOffers = campaignOffers.filter(
      (co) => co.status === 'PENDING',
    ).length;

    return {
      ...influencer,
      userType: 'influencer',
      lastLoginAt: lastLoginAt,
      lastLoginDevice: lastLoginToken?.device,
      lastLoginIp: lastLoginToken?.ipAddress,
      lastLoginLocation:
        lastLoginToken?.city || lastLoginToken?.country
          ? `${lastLoginToken.city || ''}${lastLoginToken.city && lastLoginToken.country ? ', ' : ''}${lastLoginToken.country || ''}`
          : null,
      campaignStats: {
        totalOffers,
        acceptedOffers,
        pendingOffers,
        rejectedOffers: campaignOffers.filter((co) => co.status === 'REJECTED')
          .length,
        counteredOffers: campaignOffers.filter(
          (co) => co.status === 'COUNTERED',
        ).length,
        acceptanceRate:
          totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0,
      },
      // Include all recent login sessions
      recentLoginSessions: influencer.refreshTokens.map((token) => ({
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

  async resetInfluencerUserPassword(
    influencerId: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await this.prisma.influencer.findUnique({
        where: { id: influencerId },
      });

      if (!user) {
        throw new NotFoundException(
          `Influencer with ID ${influencerId} not found`,
        );
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
      await this.prisma.influencer.update({
        where: { id: influencerId },
        data: { password: hashedPassword },
      });

      return {
        success: true,
        message: 'Password successfully reset',
      };
    } catch (error) {
      this.logger.error(
        `Failed to reset password for influencer ${influencerId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Change email for influencer
  async changeEmail(influencerId: string, email: string) {
    // Check if email already exists
    const existingInfluencer = await this.prisma.influencer.findUnique({
      where: { email },
    });

    if (existingInfluencer && existingInfluencer.id !== influencerId) {
      throw new BadRequestException('Email already in use');
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: { email, isEmailConfirmed: false }, // Reset email confirmation
    });

    // await this.logAudit(adminId, 'CHANGE_EMAIL_INFLUENCER', influencerId, { email });

    return { success: true };
  }

  // Change phone for influencer
  async changePhone(influencerId: string, phone: string) {
    // Check if phone already exists
    const existingInfluencer = await this.prisma.influencer.findFirst({
      where: {
        phoneNumber: phone,
        NOT: { id: influencerId }, // Exclude current influencer
      },
    });

    if (existingInfluencer) {
      throw new BadRequestException('Phone number already in use');
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: { phoneNumber: phone },
    });

    return { success: true };
  }

  // Change status (activate/deactivate) for influencer
  async changeStatus(influencerId: string, isActive: boolean) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      throw new NotFoundException('Influencer not found');
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: {
        isEmailConfirmed: isActive,
      },
    });

    // await this.logAudit(adminId, isActive ? 'ACTIVATE_INFLUENCER' : 'DEACTIVATE_INFLUENCER', influencerId, {
    //   isActive,
    // });

    return { success: true };
  }

  // Get influencer login history
  async getInfluencerLoginHistory(influencerId: string, limit = 10) {
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        influencerId: influencerId,
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

  // Get influencer campaign offers with details
  async getInfluencerCampaignOffers(
    influencerId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: CampaignOfferStatus;
    },
  ) {
    const { page = 1, limit = 10, status } = params || {};

    const skip = (page - 1) * limit;

    const where: Prisma.CampaignOfferWhereInput = {
      influencerId,
    };

    if (status) {
      where.status = status;
    }

    const [offers, total] = await Promise.all([
      this.prisma.campaignOffer.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          business: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.campaignOffer.count({ where }),
    ]);

    return {
      data: offers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
