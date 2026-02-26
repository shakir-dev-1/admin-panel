// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Patch,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InfluencersService } from './influencers.service.js';
import type { InfluencerSortField, SortOrder } from './influencers.service.js';
import { CampaignOfferStatus } from '../../generated/prisma/client.js';
import { Audit } from '../../audit/audit.decorator.js';

// DTOs for request validation
class ChangeEmailDto {
  email: string;
}

class ChangePhoneDto {
  phoneNumber: string;
}

class ChangeStatusDto {
  isActive: boolean;
}

@Controller('admin/influencers')
export class InfluencersController {
  constructor(private readonly influencersService: InfluencersService) {}

  /**
   * Get paginated influencers with filters and sorting
   */
  @Get()
  async getInfluencers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('sortBy') sortBy?: InfluencerSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
  ) {
    return this.influencersService.getInfluencers({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Get all influencers (non-paginated, for dropdowns or exports)
   */
  @Get('all')
  async getAllInfluencers() {
    return this.influencersService.getAllInfluencers();
  }

  /**
   * Get recent influencers for dashboard
   */
  @Get('recent')
  async getRecentInfluencers(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.influencersService.getRecentInfluencers(limit);
  }

  /**
   * Get single influencer by ID
   */
  @Get(':influencerId')
  async getInfluencerById(@Param('influencerId') influencerId: string) {
    return this.influencersService.getInfluencerById(influencerId);
  }

  /**
   * Get influencer's login history
   */
  @Get(':influencerId/login-history')
  async getInfluencerLoginHistory(
    @Param('influencerId') influencerId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.influencersService.getInfluencerLoginHistory(
      influencerId,
      limit,
    );
  }

  /**
   * Get influencer's campaign offers
   */
  @Get(':influencerId/campaign-offers')
  async getInfluencerCampaignOffers(
    @Param('influencerId') influencerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: CampaignOfferStatus,
  ) {
    return this.influencersService.getInfluencerCampaignOffers(influencerId, {
      page,
      limit,
      status,
    });
  }

  /**
   * Force password reset for an influencer
   */
  @Post(':influencerId/reset-password')
  @Audit('PASSWORD_RESET')
  async resetPassword(
    @Param('influencerId') influencerId: string,
    @Body('password') password: string,
  ) {
    return this.influencersService.resetInfluencerUserPassword(
      influencerId,
      password,
    );
  }

  /**
   * Change influencer's email
   */
  @Patch(':influencerId/email')
  @Audit('EMAIL_CHANGE')
  async changeEmail(
    @Param('influencerId') influencerId: string,
    @Body() dto: ChangeEmailDto,
  ) {
    return this.influencersService.changeEmail(influencerId, dto.email);
  }

  /**
   * Change influencer's phone number
   */
  @Patch(':influencerId/phone')
  @Audit('PHONE_CHANGE')
  async changePhone(
    @Param('influencerId') influencerId: string,
    @Body() dto: ChangePhoneDto,
  ) {
    return this.influencersService.changePhone(influencerId, dto.phoneNumber);
  }

  /**
   * Activate/Deactivate influencer
   */
  @Patch(':influencerId/status')
  @Audit('STATUS_CHANGE')
  async changeStatus(
    @Param('influencerId') influencerId: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.influencersService.changeStatus(influencerId, dto.isActive);
  }

  /**
   * Search influencers with advanced filters
   */
  @Get('search/advanced')
  async searchInfluencers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('username') username?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('twoFactorEnabled') twoFactorEnabled?: string,
    @Query('sortBy') sortBy?: InfluencerSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
  ) {
    // Build search query from multiple parameters
    const searchQuery = search || email || phone || username;

    // You could extend the service method to handle more advanced filters
    // For now, using the existing getInfluencers with search
    return this.influencersService.getInfluencers({
      page,
      limit,
      search: searchQuery,
      status,
      sortBy,
      sortOrder,
    });
  }
}
