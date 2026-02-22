// src/admin/payments/payments.controller.ts
import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  // UseGuards,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
// import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { Audit } from '../../audit/audit.decorator.js';

// @UseGuards(AdminGuard)
@Controller('admin/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('businesses')
  @Audit('VIEW_BUSINESSES')
  async getBusinesses() {
    return this.paymentsService.getBusinesses();
  }

  @Get('payments')
  @Audit('VIEW_ALL_PAYMENTS')
  async getAllPayments(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllPayments(limit, cursor);
  }

  @Get('payments/stats')
  @Audit('VIEW_PAYMENT_STATS')
  async getGlobalPaymentStats() {
    return this.paymentsService.getGlobalPaymentStats();
  }

  @Get('payments/failed')
  @Audit('VIEW_FAILED_PAYMENTS')
  async getAllFailedPayments(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllFailedPayments(limit, cursor);
  }

  @Post('payments/:transactionId/refund')
  @HttpCode(HttpStatus.OK)
  @Audit('REFUND_PAYMENT')
  async refundPayment(@Param('transactionId') transactionId: string) {
    if (!transactionId) {
      throw new BadRequestException('Transaction ID is required');
    }
    return this.paymentsService.refundPayment(transactionId);
  }

  @Get('disputes')
  @Audit('VIEW_ALL_DISPUTES')
  async getAllDisputes(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('starting_after') startingAfter?: string,
  ) {
    return this.paymentsService.getAllDisputes(limit, startingAfter);
  }

  @Get('refunds')
  @Audit('VIEW_ALL_REFUNDS')
  async getAllRefunds(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllRefunds(limit, cursor);
  }

  @Get(':id')
  @Audit('VIEW_BUSINESS_PAYMENT_DETAILS')
  async getBusiness(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.getBusiness(id);
  }

  @Get(':id/subscription')
  @Audit('VIEW_BUSINESS_SUBSCRIPTION')
  async getSubscription(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.getSubscription(id);
  }

  @Get(':id/payments')
  @Audit('VIEW_BUSINESS_PAYMENTS')
  async getPayments(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.getPayments(id);
  }

  @Get(':id/payments/failed')
  @Audit('VIEW_BUSINESS_FAILED_PAYMENTS')
  async getFailedPayments(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.getFailedPayments(id);
  }

  @Patch(':id/cancel-subscription')
  @HttpCode(HttpStatus.OK)
  @Audit('CANCEL_BUSINESS_SUBSCRIPTION')
  async cancelSubscription(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.cancelSubscription(id);
  }

  @Get(':id/disputes')
  @Audit('VIEW_BUSINESS_DISPUTES')
  async getDisputes(@Param('id') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('Business ID is required');
    }
    return this.paymentsService.getDisputes(businessId);
  }

  @Post(':id/create-payment-intent')
  @HttpCode(HttpStatus.CREATED)
  @Audit('CREATE_PAYMENT_INTENT')
  async createPaymentIntent(
    @Param('id') businessId: string,
    @Body() body: { amount: number; invoiceId: string; clientId?: string },
  ) {
    if (!businessId) {
      throw new BadRequestException('Business ID is required');
    }
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Valid amount is required');
    }
    if (!body.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    return this.paymentsService.createPaymentIntent(
      businessId,
      body.amount,
      body.invoiceId,
      body.clientId,
    );
  }

  @Get(':id/clients')
  @Audit('VIEW_BUSINESS_CLIENTS')
  async getBusinessClients(@Param('id') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('Business ID is required');
    }

    return this.paymentsService.getBusinessClients(businessId);
  }
}
