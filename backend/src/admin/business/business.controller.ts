// src/admin/business/business.controller.ts
import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BusinessService } from './business.service.js';
import type { BusinessUserSortField, SortOrder } from './business.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { RolesGuard } from '../auth/guards/roles.guard.js';
// import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';

@UseGuards(AdminGuard) // Apply guard globally to this controller
@Controller('admin/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('users')
  async getAllBusinessUsers() {
    return this.businessService.getAllBusinessUsers();
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
    return this.businessService.getBusinessUsers({
      page: isNaN(parsedPage) ? 1 : parsedPage,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:id')
  async getBusinessUserById(@Param('id') id: string) {
    return this.businessService.getBusinessUserById(id);
  }

  //   @Get('businesses')
  //   getBusinesses() {
  //     return this.businessService.getBusinesses();
  //   }

  //   @Get('payments')
  //   async getAllPayments(
  //     @Query('limit') limit?: string, // Queries come in as strings
  //     @Query('starting_after') cursor?: string,
  //   ) {
  //     const result = await this.businessService.getAllPayments(
  //       limit ? parseInt(limit) : 50,
  //       cursor,
  //     );
  //     return result; // Service will now return the full object
  //   }

  //   @Get('payments/stats')
  //   getGlobalPaymentStats() {
  //     return this.businessService.getGlobalPaymentStats();
  //   }

  //   @Get('payments/failed')
  //   getAllFailedPayments(
  //     @Query('limit') limit?: number,
  //     @Query('starting_after') cursor?: string,
  //   ) {
  //     return this.businessService.getAllFailedPayments(limit, cursor);
  //   }

  //   @Post('payments/:paymentIntentId/refund')
  //   refundPayment(@Param('paymentIntentId') paymentIntentId: string) {
  //     return this.businessService.refundPayment(paymentIntentId);
  //   }

  //   @Get('disputes')
  //   getAllDisputes(
  //     @Query('limit') limit?: number,
  //     @Query('starting_after') cursor?: string,
  //   ) {
  //     return this.businessService.getAllDisputes(limit, cursor);
  //   }

  //   @Get('refunds')
  //   getAllRefunds(
  //     @Query('limit') limit?: number,
  //     @Query('starting_after') cursor?: string,
  //   ) {
  //     return this.businessService.getAllRefunds(limit, cursor);
  //   }

  //   @Get(':id')
  //   getBusiness(@Param('id') id: string) {
  //     return this.businessService.getBusiness(id);
  //   }

  //   @Get(':id/subscription')
  //   getSubscription(@Param('id') id: string) {
  //     return this.businessService.getSubscription(id);
  //   }

  //   @Get(':id/payments')
  //   getPayments(@Param('id') id: string) {
  //     return this.businessService.getPayments(id);
  //   }

  //   @Get(':id/payments/failed')
  //   getFailedPayments(@Param('id') id: string) {
  //     return this.businessService.getFailedPayments(id);
  //   }

  //   @Patch(':id/cancel-subscription')
  //   cancelSubscription(@Param('id') id: string) {
  //     return this.businessService.cancelSubscription(id);
  //   }

  //   @Get(':id/disputes')
  //   getDisputes(@Param('id') businessId: string) {
  //     return this.businessService.getDisputes(businessId);
  //   }
}
