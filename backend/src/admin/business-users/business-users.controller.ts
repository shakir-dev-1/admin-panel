// src/admin/business/business.controller.ts
import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BusinessUsersService } from './business-users.service.js';
import type {
  BusinessUserSortField,
  SortOrder,
} from './business-users.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { RolesGuard } from '../auth/guards/roles.guard.js';
// import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { Audit } from '../../audit/audit.decorator.js';

@UseGuards(AdminGuard) // Apply guard globally to this controller
@Controller('admin/business')
export class BusinessUsersController {
  constructor(private readonly businessUsersService: BusinessUsersService) {}

  @Get('users')
  async getAllBusinessUsers() {
    return this.businessUsersService.getAllBusinessUsers();
  }

  @Get('users/list')
  async getBusinessUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('type') userType: string,
    @Query('sortBy') sortBy: BusinessUserSortField,
    @Query('sortOrder') sortOrder: SortOrder,
  ) {
    const parsedPage = parseInt(page, 10);
    return this.businessUsersService.getBusinessUsers({
      page: isNaN(parsedPage) ? 1 : parsedPage,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:id')
  async getBusinessUserById(@Param('id') id: string) {
    return this.businessUsersService.getBusinessUserById(id);
  }

  /**
   * Reset password for a business user
   */
  @Post('users/:id/reset-password')
  @Audit('RESET_PASSWORD')
  @HttpCode(HttpStatus.OK)
  async resetBusinessUserPassword(@Param('id') id: string) {
    return this.businessUsersService.forceBusinessUserPasswordReset(id);
  }

  /**
   * Change email for a business user
   */
  @Patch('users/:id/email')
  @Audit('EMAIL_CHANGE') // This will be logged
  @HttpCode(HttpStatus.OK)
  async changeBusinessUserEmail(
    @Param('id') id: string,
    @Body() body: { email: string },
  ) {
    const { email } = body;
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.businessUsersService.changeBusinessUserEmail(id, email);
  }

  /**
   * Change phone number for a business user
   */
  @Patch('users/:id/phone')
  @Audit('PHONE_CHANGE')
  @HttpCode(HttpStatus.OK)
  async changeBusinessUserPhone(
    @Param('id') id: string,
    @Body() body: { phoneNumber: string },
  ) {
    const { phoneNumber } = body;
    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }
    return this.businessUsersService.changeBusinessUserPhone(id, phoneNumber);
  }

  /**
   * Change email confirmation status for a business user
   */
  @Patch('users/:id/email-confirmation')
  @Audit('CHANGE_EMAIL_CONFIRMATION_STATUS')
  @HttpCode(HttpStatus.OK)
  async changeBusinessUserEmailConfirmation(
    @Param('id') id: string,
    @Body() body: { isEmailConfirmed: boolean },
  ) {
    const { isEmailConfirmed } = body;
    if (typeof isEmailConfirmed !== 'boolean') {
      throw new BadRequestException('isEmailConfirmed must be a boolean');
    }
    return this.businessUsersService.changeBusinessUserEmailConfirmation(
      id,
      isEmailConfirmed,
    );
  }

  @Patch('users/:id/subscription/cancel')
  @Audit('CANCEL_SUBSCRIPTION')
  @HttpCode(HttpStatus.OK)
  cancelSubscription(@Param('id') id: string) {
    return this.businessUsersService.cancelSubscription(id);
  }

  @Patch('users/:id/subscription/immediately-cancel')
  @Audit('IMMEDIATELY_CANCEL_SUBSCRIPTION')
  @HttpCode(HttpStatus.OK)
  immediatelyCancelSubscription(@Param('id') id: string) {
    return this.businessUsersService.immediatelyCancelSubscription(id);
  }

  @Get('users/:id/subscription')
  getSubscription(@Param('id') id: string) {
    return this.businessUsersService.getSubscription(id);
  }

  //   @Get('businesses')
  //   getBusinesses() {
  //     return this.businessService.getBusinesses();
  //   }

  //   @Get('disputes')
  //   getAllDisputes(
  //     @Query('limit') limit?: number,
  //     @Query('starting_after') cursor?: string,
  //   ) {
  //     return this.businessService.getAllDisputes(limit, cursor);
  //   }

  //   @Get(':id')
  //   getBusiness(@Param('id') id: string) {
  //     return this.businessService.getBusiness(id);
  //   }

  //   @Get(':id/payments')
  //   getPayments(@Param('id') id: string) {
  //     return this.businessService.getPayments(id);
  //   }

  //   @Get(':id/payments/failed')
  //   getFailedPayments(@Param('id') id: string) {
  //     return this.businessService.getFailedPayments(id);
  //   }

  //   @Get(':id/disputes')
  //   getDisputes(@Param('id') businessId: string) {
  //     return this.businessService.getDisputes(businessId);
  //   }
}
