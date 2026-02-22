/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

  // ─── Businesses ──────────────────────────────────────────────────────────

  @Get('businesses')
  @Audit('VIEW_BUSINESSES')
  async getBusinesses() {
    return this.paymentsService.getBusinesses();
  }

  // ─── Global Transactions ─────────────────────────────────────────────────

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
    if (!transactionId)
      throw new BadRequestException('Transaction ID is required');
    return this.paymentsService.refundPayment(transactionId);
  }

  // ─── Global Refunds ───────────────────────────────────────────────────────

  @Get('refunds')
  @Audit('VIEW_ALL_REFUNDS')
  async getAllRefunds(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllRefunds(limit, cursor);
  }

  // ─── Global Disputes ──────────────────────────────────────────────────────

  @Get('disputes')
  @Audit('VIEW_ALL_DISPUTES')
  async getAllDisputes(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('starting_after') startingAfter?: string,
  ) {
    return this.paymentsService.getAllDisputes(limit, startingAfter);
  }

  // ─── Subscription Plans ───────────────────────────────────────────────────

  @Get('subscription-plans')
  @Audit('VIEW_SUBSCRIPTION_PLANS')
  async getAllSubscriptionPlans() {
    return this.paymentsService.getAllSubscriptionPlans();
  }

  @Get('subscriptions')
  @Audit('VIEW_ALL_SUBSCRIPTIONS')
  async getAllBusinessSubscriptions(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('billingCycle') billingCycle?: string,
  ) {
    return this.paymentsService.getAllBusinessSubscriptions({
      limit,
      cursor,
      status: status as any,
      billingCycle: billingCycle as any,
    });
  }

  @Get('subscriptions/:subscriptionId/history')
  @Audit('VIEW_SUBSCRIPTION_HISTORY')
  async getSubscriptionHistory(
    @Param('subscriptionId') subscriptionId: string,
  ) {
    if (!subscriptionId)
      throw new BadRequestException('Subscription ID is required');
    return this.paymentsService.getSubscriptionHistory(subscriptionId);
  }

  // ─── Global Invoices ──────────────────────────────────────────────────────

  @Get('invoices/stats')
  @Audit('VIEW_GLOBAL_INVOICE_STATS')
  async getGlobalInvoiceStats() {
    return this.paymentsService.getInvoiceStats();
  }

  @Get('invoices/:invoiceId')
  @Audit('VIEW_INVOICE')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    if (!invoiceId) throw new BadRequestException('Invoice ID is required');
    return this.paymentsService.getInvoice(invoiceId);
  }

  // ─── Payout Info ─────────────────────────────────────────────────────────

  @Get('payout-info')
  @Audit('VIEW_ALL_PAYOUT_INFO')
  async getAllPayoutInfo(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllPayoutInfo(limit, cursor);
  }

  @Get('banks')
  @Audit('VIEW_BANKS')
  async getBanks() {
    return this.paymentsService.getBanks();
  }

  // ─── Add-Ons ─────────────────────────────────────────────────────────────

  @Get('add-ons')
  @Audit('VIEW_ALL_ADD_ONS')
  async getAllAddOns(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllAddOns(limit, cursor);
  }

  // ─── Per-Business Routes ──────────────────────────────────────────────────
  // NOTE: specific sub-paths (e.g. /payments/stats) MUST be declared before
  // the generic /:id route so NestJS doesn't swallow them as param matches.

  @Get(':id')
  @Audit('VIEW_BUSINESS_PAYMENT_DETAILS')
  async getBusiness(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusiness(id);
  }

  @Get(':id/subscription')
  @Audit('VIEW_BUSINESS_SUBSCRIPTION')
  async getSubscription(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getSubscription(id);
  }

  @Patch(':id/cancel-subscription')
  @HttpCode(HttpStatus.OK)
  @Audit('CANCEL_BUSINESS_SUBSCRIPTION')
  async cancelSubscription(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.cancelSubscription(id);
  }

  @Get(':id/payments')
  @Audit('VIEW_BUSINESS_PAYMENTS')
  async getPayments(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getPayments(id);
  }

  @Get(':id/payments/failed')
  @Audit('VIEW_BUSINESS_FAILED_PAYMENTS')
  async getFailedPayments(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getFailedPayments(id);
  }

  @Get(':id/invoices')
  @Audit('VIEW_BUSINESS_INVOICES')
  async getBusinessInvoices(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessInvoices(id, {
      limit,
      cursor,
      paymentStatus: paymentStatus as any,
    });
  }

  @Get(':id/invoices/stats')
  @Audit('VIEW_BUSINESS_INVOICE_STATS')
  async getBusinessInvoiceStats(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getInvoiceStats(id);
  }

  @Get(':id/disputes')
  @Audit('VIEW_BUSINESS_DISPUTES')
  async getDisputes(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getDisputes(businessId);
  }

  @Get(':id/payout-info')
  @Audit('VIEW_BUSINESS_PAYOUT_INFO')
  async getBusinessPayoutInfo(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessPayoutInfo(businessId);
  }

  @Get(':id/add-ons')
  @Audit('VIEW_BUSINESS_ADD_ONS')
  async getBusinessAddOns(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessAddOns(businessId);
  }

  @Get(':id/clients')
  @Audit('VIEW_BUSINESS_CLIENTS')
  async getBusinessClients(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessClients(businessId);
  }

  @Post(':id/create-payment-intent')
  @HttpCode(HttpStatus.CREATED)
  @Audit('CREATE_PAYMENT_INTENT')
  async createPaymentIntent(
    @Param('id') businessId: string,
    @Body() body: { amount: number; invoiceId: string; clientId?: string },
  ) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    if (!body.amount || body.amount <= 0)
      throw new BadRequestException('Valid amount is required');
    if (!body.invoiceId)
      throw new BadRequestException('Invoice ID is required');

    return this.paymentsService.createPaymentIntent(
      businessId,
      body.amount,
      body.invoiceId,
      body.clientId,
    );
  }
}
