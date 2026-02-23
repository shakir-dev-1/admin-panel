/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  Prisma,
  BusinessUserType,
  TwoFactorType,
  Roles,
  InvitationStatus,
  RewardType,
  RewardStatus,
  SubscriptionStatus,
  BillingCycle,
  PaymentStatus,
} from '../../generated/prisma/client.js';
// import { jest } from '@jest/globals'; // Add this if you use jest.fn() inside the service itself
import * as crypto from 'crypto';

export type BusinessUserSortField =
  | 'email'
  | 'createdAt'
  | 'updatedAt'
  | 'firstName'
  | 'lastName'
  | 'lastLogin'
  | undefined;

export type SortOrder = 'asc' | 'desc';

export interface BusinessUserListResult {
  id: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  referralCode: string;
  inviteCode: string | null;
  isEmailConfirmed: boolean;
  isAgreementAccepted: boolean;
  businessUserType: BusinessUserType;
  clerkUserId: string;
  createdAt: Date;
  updatedAt: Date;
  associatedBusinesses: {
    id: string;
    name: string;
    role: Roles;
  }[];
  totalBusinesses: number;
  lastLoginAt?: Date;
  lastLoginDevice?: string | null;
  lastLoginIp?: string | null;
  lastLoginLocation?: string | null;
}

export interface BusinessUserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  email?: string;
  phoneNumber?: string;
  businessUserType?: BusinessUserType;
  isEmailConfirmed?: boolean;
  isAgreementAccepted?: boolean;
  sortBy?:
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'createdAt'
    | 'updatedAt'
    | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

export interface BusinessUserDetailResult {
  id: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  referralCode: string;
  inviteCode: string | null;
  businessUserType: BusinessUserType;
  clerkUserId: string;
  isEmailConfirmed: boolean;
  isAgreementAccepted: boolean;
  twoFactorEnabled: boolean;
  twoFactorType: TwoFactorType | null;
  isEmployeeConsentApproved: boolean;
  dateOfBirth: Date | null;
  gender: string | null;
  city: string | null;
  zipcode: string | null;
  address: string | null;
  state: string | null;
  homeNumber: string | null;
  floor: string | null;
  street: string | null;
  area: string | null;
  sector: string | null;
  alternativePhoneNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  avatar: {
    id: string;
    url: string;
    key: string;
  } | null;
  businesses: Array<{
    id: string;
    name: string;
    industryType: string[];
    city: string;
    country: string;
    isVerified: boolean;
    role: Roles;
    joinedAt: Date;
    memberId: string;
    subscriptions: Array<{
      id: string;
      status: SubscriptionStatus;
      billingCycle: BillingCycle;
      startDate: Date | null;
      endDate: Date | null;
      paymentStatus: PaymentStatus | null;
      isTrialUsed: boolean | null;
      cancelAtPeriodEnd: boolean | null;
      canceledDate: Date | null;
      orderId: string | null;
      plan: {
        id: string;
        title: string;
        prices: Prisma.JsonValue;
        features: Prisma.JsonValue;
        trialPeriodDays: number | null;
        country: string;
      };
    }>;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    status: InvitationStatus;
    createdAt: Date;
  }>;
  rewards: Array<{
    id: string;
    rewardType: RewardType;
    status: RewardStatus;
    amount: number;
    createdAt: Date;
    referredByUser: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>;
  refreshTokens: Array<{
    id: string;
    userAgent: string;
    lastLogin: Date;
    ipAddress: string | null;
    device: string | null;
    createdAt: Date;
  }>;
  businessUserSettings: {
    appointmentNotification: boolean;
  } | null;
  // Add these new fields
  lastLoginAt?: Date;
  lastLoginDevice?: string | null;
  lastLoginIp?: string | null;
  lastLoginLocation?: string | null;
  recentLoginSessions?: Array<{
    id: string;
    lastLogin: Date;
    device: string | null;
    userAgent: string;
    ipAddress: string | null;
    location: string | null;
    coordinates?: {
      latitude: number;
      longitude: number;
    } | null;
    region: string | null;
    timezone: string | null;
    sessionStart: Date;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class BusinessUsersService {
  private readonly logger = new Logger(BusinessUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  /**
   * Get business users with filtering and pagination
   */
  async getBusinessUsers(
    params: BusinessUserFilterParams,
  ): Promise<PaginatedResult<BusinessUserListResult>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        email,
        phoneNumber,
        businessUserType,
        isEmailConfirmed,
        isAgreementAccepted,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.BusinessUserWhereInput = {};

      // Search across multiple fields
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { referralCode: { contains: search, mode: 'insensitive' } },
          { inviteCode: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add individual filters
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }

      if (phoneNumber) {
        where.phoneNumber = { contains: phoneNumber };
      }

      if (businessUserType) {
        where.businessUserType = businessUserType;
      }

      if (typeof isEmailConfirmed === 'boolean') {
        where.isEmailConfirmed = isEmailConfirmed;
      }

      if (typeof isAgreementAccepted === 'boolean') {
        where.isAgreementAccepted = isAgreementAccepted;
      }

      // Build orderBy - handle lastLogin specially
      let orderBy: Prisma.BusinessUserOrderByWithRelationInput = {};
      if (sortBy === 'lastLogin') {
        // For lastLogin sorting, we'll sort in memory after fetching
        orderBy = { createdAt: 'desc' }; // Default order
      } else {
        orderBy[sortBy] = sortOrder;
      }

      // Execute query with count
      const [businessUsers, total] = await Promise.all([
        this.prisma.businessUser.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            email: true,
            username: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            referralCode: true,
            inviteCode: true,
            isEmailConfirmed: true,
            isAgreementAccepted: true,
            businessUserType: true,
            clerkUserId: true,
            createdAt: true,
            updatedAt: true,
            businesses: {
              select: {
                id: true,
                role: {
                  select: {
                    name: true,
                  },
                },
                business: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            // Add refresh tokens for last login info
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
        this.prisma.businessUser.count({ where }),
      ]);

      // Transform results
      let data: BusinessUserListResult[] = businessUsers.map((user) => {
        const lastRefreshToken = user.refreshTokens[0];
        const lastLoginAt = lastRefreshToken?.lastLogin;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName:
            user.fullName ||
            (user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : null),
          referralCode: user.referralCode,
          inviteCode: user.inviteCode,
          isEmailConfirmed: user.isEmailConfirmed,
          isAgreementAccepted: user.isAgreementAccepted,
          businessUserType: user.businessUserType,
          clerkUserId: user.clerkUserId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          associatedBusinesses: user.businesses.map((business) => ({
            id: business.business.id,
            name: business.business.name,
            role: business.role.name,
          })),
          totalBusinesses: user.businesses.length,
          userType: 'business',
          // Add last login fields
          lastLoginAt: lastLoginAt,
          lastLoginDevice: lastRefreshToken?.device || null,
          lastLoginIp: lastRefreshToken?.ipAddress || null,
          lastLoginLocation:
            lastRefreshToken?.city || lastRefreshToken?.country
              ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
              : null,
        };
      });

      // If sorting by lastLogin, sort in memory
      if (sortBy === 'lastLogin') {
        data = [...data].sort((a, b) => {
          const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;

          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        });
      }

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get business users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Update getRecentBusinessUsers to include last login
  async getRecentBusinessUsers(limit = 5) {
    const businessUsers = await this.prisma.businessUser.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        businessUserType: true,
        isEmailConfirmed: true,
        isAgreementAccepted: true,
        createdAt: true,
        updatedAt: true,
        businesses: {
          take: 1,
          select: {
            business: {
              select: {
                name: true,
              },
            },
          },
        },
        // Add refresh tokens for last login info
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

    return businessUsers.map((user) => {
      const lastRefreshToken = user.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        userType: user.businessUserType,
        status: user.isEmailConfirmed ? 'ACTIVE' : 'PENDING_VERIFICATION',
        businessName: user.businesses[0]?.business?.name || null,
        createdAt: user.createdAt,
        lastActivity: user.updatedAt,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
      };
    });
  }

  // Update getAllBusinessUsers to include last login
  async getAllBusinessUsers() {
    const businessUsers = await this.prisma.businessUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        businessUserType: true,
        isEmailConfirmed: true,
        isAgreementAccepted: true,
        createdAt: true,
        updatedAt: true,
        businesses: {
          select: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Add refresh tokens for last login info
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

    return businessUsers.map((user) => {
      const lastRefreshToken = user.refreshTokens[0];
      const lastLoginAt = lastRefreshToken?.lastLogin;

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        businessUserType: user.businessUserType,
        status: user.isEmailConfirmed ? 'ACTIVE' : 'PENDING_VERIFICATION',
        agreementAccepted: user.isAgreementAccepted,
        businesses: user.businesses.map((b) => ({
          id: b.business.id,
          name: b.business.name,
        })),
        createdAt: user.createdAt,
        lastActivity: user.updatedAt,
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastRefreshToken?.device || null,
        lastLoginIp: lastRefreshToken?.ipAddress || null,
        lastLoginLocation:
          lastRefreshToken?.city || lastRefreshToken?.country
            ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
            : null,
        userType: 'business',
      };
    });
  }

  // Add a new method to get business user login history
  async getBusinessUserLoginHistory(businessUserId: string, limit = 10) {
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        businessUserId: businessUserId,
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

  /**
   * Get a single business user by ID with full details
   */
  async getBusinessUserById(userId: string): Promise<BusinessUserDetailResult> {
    try {
      const businessUser = await this.prisma.businessUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          fullName: true,
          referralCode: true,
          inviteCode: true,
          businessUserType: true,
          clerkUserId: true,
          isEmailConfirmed: true,
          isAgreementAccepted: true,
          twoFactorEnabled: true,
          twoFactorType: true,
          isEmployeeConsentApproved: true,
          dateOfBirth: true,
          gender: true,
          city: true,
          zipcode: true,
          address: true,
          state: true,
          homeNumber: true,
          floor: true,
          street: true,
          area: true,
          sector: true,
          alternativePhoneNumber: true,
          createdAt: true,
          updatedAt: true,
          avatar: {
            select: {
              id: true,
              url: true,
              key: true,
            },
          },
          businesses: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              business: {
                select: {
                  id: true,
                  name: true,
                  industryType: true,
                  city: true,
                  country: true,
                  isVerified: true,
                  subscription: {
                    select: {
                      id: true,
                      status: true,
                      billingCycle: true,
                      startDate: true,
                      endDate: true,
                      paymentStatus: true,
                      isTrialUsed: true,
                      cancelAtPeriodEnd: true,
                      canceledDate: true,
                      orderId: true,
                      subscription: {
                        select: {
                          id: true,
                          title: true,
                          prices: true,
                          features: true,
                          trialPeriodDays: true,
                          country: true,
                        },
                      },
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                  },
                },
              },
            },
          },
          invitations: {
            select: {
              id: true,
              email: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          rewardReceived: {
            select: {
              id: true,
              rewardType: true,
              status: true,
              amount: true,
              createdAt: true,
              referredByUser: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          refreshTokens: {
            select: {
              id: true,
              userAgent: true,
              lastLogin: true,
              ipAddress: true,
              device: true,
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
            take: 5, // Get last 5 login sessions
          },
          businessUserSettings: {
            select: {
              appointmentNotification: true,
            },
          },
        },
      });

      if (!businessUser) {
        throw new NotFoundException('Business user not found');
      }

      const lastLoginToken = businessUser.refreshTokens[0];
      const lastLoginAt = lastLoginToken?.lastLogin;

      return {
        ...businessUser,
        businesses: businessUser.businesses.map((membership) => ({
          id: membership.business.id, // Business ID
          name: membership.business.name,
          industryType: membership.business.industryType,
          city: membership.business.city,
          country: membership.business.country,
          isVerified: membership.business.isVerified,
          role: membership.role.name, // Role from the membership
          joinedAt: membership.createdAt, // When they joined (from BusinessMember)
          memberId: membership.id, // BusinessMember ID
          subscriptions: membership.business.subscription.map((sub) => ({
            id: sub.id,
            status: sub.status,
            billingCycle: sub.billingCycle,
            startDate: sub.startDate,
            endDate: sub.endDate,
            paymentStatus: sub.paymentStatus,
            isTrialUsed: sub.isTrialUsed,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            canceledDate: sub.canceledDate,
            orderId: sub.orderId,
            plan: {
              id: sub.subscription.id,
              title: sub.subscription.title,
              prices: sub.subscription.prices,
              features: sub.subscription.features,
              trialPeriodDays: sub.subscription.trialPeriodDays,
              country: sub.subscription.country,
            },
          })),
        })),
        rewards: businessUser.rewardReceived,
        avatar: businessUser.avatar
          ? {
              id: businessUser.avatar.id,
              url: businessUser.avatar.url,
              key: businessUser.avatar.key,
            }
          : null,
        // Add last login fields
        lastLoginAt: lastLoginAt,
        lastLoginDevice: lastLoginToken?.device || null,
        lastLoginIp: lastLoginToken?.ipAddress || null,
        lastLoginLocation:
          lastLoginToken?.city || lastLoginToken?.country
            ? `${lastLoginToken.city || ''}${lastLoginToken.city && lastLoginToken.country ? ', ' : ''}${lastLoginToken.country || ''}`
            : null,
        // Include all recent login sessions
        recentLoginSessions: businessUser.refreshTokens.map((token) => ({
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
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get business user by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get business users by business ID
   */
  async getBusinessUsersByBusinessId(
    businessId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: Roles;
    },
  ): Promise<PaginatedResult<BusinessUserListResult>> {
    try {
      const { page = 1, limit = 10, search, role } = params || {};

      const skip = (page - 1) * limit;

      const where: Prisma.BusinessUserWhereInput = {
        businesses: {
          some: {
            businessId,
            ...(role && {
              role: {
                name: role,
              },
            }),
          },
        },
      };

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [businessUsers, total] = await Promise.all([
        this.prisma.businessUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            email: true,
            username: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            referralCode: true,
            inviteCode: true,
            isEmailConfirmed: true,
            isAgreementAccepted: true,
            businessUserType: true,
            clerkUserId: true,
            createdAt: true,
            updatedAt: true,
            businesses: {
              where: {
                businessId,
              },
              select: {
                id: true,
                role: {
                  select: {
                    name: true,
                  },
                },
                business: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                designation: true,
                onlineBooking: true,
                walkInBooking: true,
                createdAt: true,
              },
            },
            // Add refresh tokens for last login info
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
        this.prisma.businessUser.count({ where }),
      ]);

      const data: BusinessUserListResult[] = businessUsers.map((user) => {
        const lastRefreshToken = user.refreshTokens[0];
        const lastLoginAt = lastRefreshToken?.lastLogin;
        // const businessMembership = user.businesses[0];

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName:
            user.fullName ||
            (user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : null),
          referralCode: user.referralCode,
          inviteCode: user.inviteCode,
          isEmailConfirmed: user.isEmailConfirmed,
          isAgreementAccepted: user.isAgreementAccepted,
          businessUserType: user.businessUserType,
          clerkUserId: user.clerkUserId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          associatedBusinesses: user.businesses.map((business) => ({
            id: business.business.id,
            name: business.business.name,
            role: business.role.name,
          })),
          totalBusinesses: user.businesses.length,
          userType: 'business',
          // Add last login fields
          lastLoginAt: lastLoginAt,
          lastLoginDevice: lastRefreshToken?.device || null,
          lastLoginIp: lastRefreshToken?.ipAddress || null,
          lastLoginLocation:
            lastRefreshToken?.city || lastRefreshToken?.country
              ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
              : null,
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get business users by business ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Search business users by email, phone, or name
   */
  async searchBusinessUsers(
    query: string,
    limit = 10,
  ): Promise<BusinessUserListResult[]> {
    try {
      const businessUsers = await this.prisma.businessUser.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { phoneNumber: { contains: query } },
          ],
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          username: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          fullName: true,
          referralCode: true,
          inviteCode: true,
          isEmailConfirmed: true,
          isAgreementAccepted: true,
          businessUserType: true,
          clerkUserId: true,
          createdAt: true,
          updatedAt: true,
          businesses: {
            select: {
              business: {
                select: {
                  id: true,
                  name: true,
                },
              },
              role: {
                select: {
                  name: true,
                },
              },
            },
            take: 2,
          },
          // Add refresh tokens for last login info
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

      return businessUsers.map((user) => {
        const lastRefreshToken = user.refreshTokens[0];
        const lastLoginAt = lastRefreshToken?.lastLogin;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName:
            user.fullName ||
            (user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : null),
          referralCode: user.referralCode,
          inviteCode: user.inviteCode,
          isEmailConfirmed: user.isEmailConfirmed,
          isAgreementAccepted: user.isAgreementAccepted,
          businessUserType: user.businessUserType,
          clerkUserId: user.clerkUserId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          associatedBusinesses: user.businesses.map((business) => ({
            id: business.business.id,
            name: business.business.name,
            role: business.role.name,
          })),
          totalBusinesses: user.businesses.length,
          userType: 'business',
          // Add last login fields
          lastLoginAt: lastLoginAt,
          lastLoginDevice: lastRefreshToken?.device || null,
          lastLoginIp: lastRefreshToken?.ipAddress || null,
          lastLoginLocation:
            lastRefreshToken?.city || lastRefreshToken?.country
              ? `${lastRefreshToken.city || ''}${lastRefreshToken.city && lastRefreshToken.country ? ', ' : ''}${lastRefreshToken.country || ''}`
              : null,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to search business users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Force password reset for business user
  async forceBusinessUserPasswordReset(businessUserId: string) {
    const businessUser = await this.prisma.businessUser.findUnique({
      where: { id: businessUserId },
    });

    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    return { success: true, token: rawToken }; // In production, send via email
  }

  // Change email for business user
  async changeBusinessUserEmail(businessUserId: string, email: string) {
    const existingUser = await this.prisma.businessUser.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== businessUserId) {
      throw new BadRequestException('Email already in use');
    }

    await this.prisma.businessUser.update({
      where: { id: businessUserId },
      data: { email, isEmailConfirmed: false },
    });

    return { success: true };
  }

  // Change phone for business user
  async changeBusinessUserPhone(businessUserId: string, phone: string) {
    const existingUser = await this.prisma.businessUser.findUnique({
      where: { phoneNumber: phone },
    });

    if (existingUser && existingUser.id !== businessUserId) {
      throw new BadRequestException('Phone number already in use');
    }

    await this.prisma.businessUser.update({
      where: { id: businessUserId },
      data: { phoneNumber: phone },
    });

    return { success: true };
  }

  // Change email confirmation status for business user
  async changeBusinessUserEmailConfirmation(
    businessUserId: string,
    isEmailConfirmed: boolean,
  ) {
    await this.prisma.businessUser.update({
      where: { id: businessUserId },
      data: { isEmailConfirmed },
    });

    return { success: true };
  }

  /**
   * Get subscription details for a business
   */
  async getSubscription(businessId: string) {
    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
      include: {
        subscription: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!businessSub) {
      throw new NotFoundException(
        'No active subscription found for this business',
      );
    }

    // If there's a Stripe subscription ID, get additional data from Stripe
    let stripeSubscription: Stripe.Response<Stripe.Subscription> | null = null;
    if (businessSub.orderId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          businessSub.orderId,
          {
            expand: ['plan.product', 'latest_invoice'],
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe subscription: ${error.message}`,
        );
        // Don't throw - we still have local data
      }
    }

    return {
      id: businessSub.id,
      plan: {
        id: businessSub.subscription.id,
        title: businessSub.subscription.title,
        features: businessSub.subscription.features,
        prices: businessSub.subscription.prices,
        trialPeriodDays: businessSub.subscription.trialPeriodDays,
      },
      status: businessSub.status,
      billingCycle: businessSub.billingCycle,
      startDate: businessSub.startDate,
      endDate: businessSub.endDate,
      paymentStatus: businessSub.paymentStatus,
      isTrialUsed: businessSub.isTrialUsed,
      cancelAtPeriodEnd: businessSub.cancelAtPeriodEnd,
      canceledDate: businessSub.canceledDate,
      orderId: businessSub.orderId,
      customerTransactionId: businessSub.customerTransactionId,
      history: businessSub.history,
      stripeSubscription,
    };
  }

  /**
   * Cancel a business subscription
   */
  async cancelSubscription(businessId: string) {
    this.logger.log(`Canceling subscription for business ID: ${businessId}`);

    // Find the active subscription
    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
      include: {
        subscription: true,
      },
    });

    if (!businessSub) {
      throw new NotFoundException(
        'No active subscription found for this business',
      );
    }

    let stripeResult: Stripe.Response<Stripe.Subscription> | null = null;

    // If there's a Stripe subscription ID, update it first
    if (businessSub.orderId) {
      try {
        stripeResult = await this.stripe.subscriptions.update(
          businessSub.orderId,
          {
            cancel_at_period_end: true,
          },
        );

        this.logger.log(
          `Stripe subscription ${businessSub.orderId} set to cancel at period end`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cancel Stripe subscription: ${error.message}`,
        );
        // Throw the error to prevent database update
        throw new BadRequestException(
          `Failed to cancel subscription in Stripe: ${error.message}`,
        );
      }
    }

    // Only update database if Stripe update succeeded (or if there was no Stripe subscription)
    try {
      // Use a transaction to ensure all database operations succeed together
      const updatedSubscription = await this.prisma.$transaction(async (tx) => {
        // Update the subscription
        const updated = await tx.businessSubscription.update({
          where: { id: businessSub.id },
          data: {
            cancelAtPeriodEnd: true,
            // Don't change status yet - will happen at period end
          },
          include: {
            subscription: true,
          },
        });

        // Create history record
        await tx.businessSubscriptionHistory.create({
          data: {
            businessSubscriptionId: businessSub.id,
            eventType: 'CANCELLED',
            subscriptionId: businessSub.orderId || businessSub.id,
            oldPlanId: businessSub.subscriptionId,
            startDate: businessSub.startDate,
            endDate: businessSub.endDate,
          },
        });

        return updated;
      });

      return {
        success: true,
        message:
          'Subscription will be canceled at the end of the billing period',
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
          endDate: updatedSubscription.endDate,
          plan: updatedSubscription.subscription.title,
        },
        stripeResult,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update database after Stripe cancellation: ${error.message}`,
      );
      throw new BadRequestException(
        'Failed to update subscription status in database',
      );
    }
  }

  /**
   * Immediately cancel a subscription (not recommended - use cancelSubscription instead)
   */
  async immediatelyCancelSubscription(businessId: string) {
    this.logger.log(
      `Immediately canceling subscription for business ID: ${businessId}`,
    );

    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    });

    if (!businessSub) {
      throw new NotFoundException(
        'No active subscription found for this business',
      );
    }

    let stripeResult: Stripe.Response<Stripe.Subscription> | null = null;

    // First cancel in Stripe
    if (businessSub.orderId) {
      try {
        stripeResult = await this.stripe.subscriptions.cancel(
          businessSub.orderId,
        );
        this.logger.log(`Stripe subscription ${businessSub.orderId} cancelled`);
      } catch (error) {
        this.logger.error(
          `Failed to cancel Stripe subscription: ${error.message}`,
        );
        throw new BadRequestException(
          `Failed to cancel subscription in Stripe: ${error.message}`,
        );
      }
    }

    // Only update database if Stripe cancellation succeeded
    try {
      const updatedSubscription = await this.prisma.$transaction(async (tx) => {
        // Update database to cancelled
        const updated = await tx.businessSubscription.update({
          where: { id: businessSub.id },
          data: {
            status: 'CANCELLED',
            canceledDate: new Date(),
            cancelAtPeriodEnd: false,
            endDate: new Date(), // Set end date to now
          },
        });

        // Create history record
        await tx.businessSubscriptionHistory.create({
          data: {
            businessSubscriptionId: businessSub.id,
            eventType: 'CANCELLED',
            subscriptionId: businessSub.orderId || businessSub.id,
            oldPlanId: businessSub.subscriptionId,
            startDate: businessSub.startDate,
            endDate: businessSub.endDate,
          },
        });

        return updated;
      });

      return {
        success: true,
        message: 'Subscription immediately canceled',
        subscription: updatedSubscription,
        stripeResult,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update database after Stripe cancellation: ${error.message}`,
      );
      throw new BadRequestException(
        'Failed to update subscription status in database',
      );
    }
  }

  //   async getBusinesses() {
  //     const businesses = await this.prisma.business.findMany({
  //       include: { user: true },
  //     });
  //     if (!businesses) throw new NotFoundException();

  //     return businesses.map((business) => ({
  //       id: business.id,
  //       name: business.name,
  //       user: business.user,
  //       stripeCustomerId: business.stripeCustomerId,
  //       stripeSubscriptionId: business.stripeSubscriptionId,
  //       subscriptionPlan: business.subscriptionPlan,
  //       subscriptionStatus: business.subscriptionStatus,
  //     }));
  //   }

  //   async getBusiness(businessId: string) {
  //     const business = await this.prisma.business.findUnique({
  //       where: { id: businessId },
  //       include: { user: true },
  //     });
  //     if (!business) throw new NotFoundException();

  //     return {
  //       name: business.name,
  //       user: business.user,
  //       stripeCustomerId: business.stripeCustomerId,
  //       stripeSubscriptionId: business.stripeSubscriptionId,
  //       subscriptionPlan: business.subscriptionPlan,
  //       subscriptionStatus: business.subscriptionStatus,
  //     };
  //   }

  //   async getDisputes(businessId: string) {
  //     const biz = await this.prisma.business.findUnique({
  //       where: { id: businessId },
  //     });
  //     if (!biz?.stripeCustomerId)
  //       throw new NotFoundException('Stripe customer not linked');

  //     // list disputes, optionally filtered by PaymentIntent/customer
  //     const disputes = await this.stripe.disputes.list({
  //       // optionally: { payment_intent: someId, limit: 100 }
  //     });
  //     return disputes.data;
  //   }

  //   async getAllDisputes(limit = 50, starting_after?: string) {
  //     const disputes = await this.stripe.disputes.list({ limit, starting_after });
  //     return disputes.data;
  //   }
}
