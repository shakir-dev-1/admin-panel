/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  // Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
// import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { Audit } from '../../audit/audit.decorator.js';
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentStatus,
} from '../../generated/prisma/client.js';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto.js';

// @UseGuards(AdminGuard)
@Controller('admin/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Businesses ──────────────────────────────────────────────────────────

  @Get('businesses')
  // @Audit('VIEW_BUSINESSES')
  async getBusinesses() {
    return this.paymentsService.getBusinesses();
  }

  // ─── Consumer Payments (User → Business via Appointment) ─────────────────

  @Get('consumer-payments')
  // @Audit('VIEW_CONSUMER_PAYMENTS')
  async getConsumerPayments(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getConsumerPayments(limit, cursor);
  }

  @Get('consumer-payments/stats')
  // @Audit('VIEW_CONSUMER_PAYMENT_STATS')
  async getConsumerPaymentStats() {
    return this.paymentsService.getConsumerPaymentStats();
  }

  @Get('consumer-payments/:userId')
  async getConsumerPaymentsByUserId(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getConsumerPaymentsByUserId(
      userId,
      limit,
      cursor,
    );
  }

  // ─── BusinessUser Payments (Business → Platform) ─────────────────────────

  @Get('business-user-payments')
  // @Audit('VIEW_BUSINESS_USER_PAYMENTS')
  async getBusinessUserPayments(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('type') type?: 'all' | 'subscription' | 'addon',
  ) {
    return this.paymentsService.getBusinessUserPayments(
      limit,
      cursor,
      type ?? 'all',
    );
  }

  @Get('business-user-payments/stats')
  // @Audit('VIEW_BUSINESS_USER_PAYMENT_STATS')
  async getBusinessUserPaymentStats() {
    return this.paymentsService.getBusinessUserPaymentStats();
  }

  // In your payments controller
  @Get('business-user-payments/:userId')
  async getBusinessUserPaymentsByUserId(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getBusinessUserPaymentsByUserId(
      userId,
      limit,
      cursor,
    );
  }

  // ─── Global Transactions ─────────────────────────────────────────────────

  @Get('payments')
  // @Audit('VIEW_ALL_PAYMENTS')
  async getAllPayments(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllPayments(limit, cursor);
  }

  @Get('payments/stats')
  // @Audit('VIEW_PAYMENT_STATS')
  async getGlobalPaymentStats() {
    return this.paymentsService.getGlobalPaymentStats();
  }

  @Get('payments/failed')
  // @Audit('VIEW_FAILED_PAYMENTS')
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
  // @Audit('VIEW_ALL_REFUNDS')
  async getAllRefunds(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllRefunds(limit, cursor);
  }

  // ─── Global Disputes ──────────────────────────────────────────────────────

  @Get('disputes')
  // @Audit('VIEW_ALL_DISPUTES')
  async getAllDisputes(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('starting_after') startingAfter?: string,
  ) {
    return this.paymentsService.getAllDisputes(limit, startingAfter);
  }

  // ─── Subscription Plans ───────────────────────────────────────────────────

  @Get('subscription-plans')
  // @Audit('VIEW_SUBSCRIPTION_PLANS')
  async getAllSubscriptionPlans() {
    return this.paymentsService.getAllSubscriptionPlans();
  }

  @Get('subscriptions')
  // @Audit('VIEW_ALL_SUBSCRIPTIONS')
  async getAllBusinessSubscriptions(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('billingCycle') billingCycle?: BillingCycle,
  ) {
    return this.paymentsService.getAllBusinessSubscriptions({
      limit,
      cursor,
      status,
      billingCycle,
    });
  }

  @Get('subscriptions/:subscriptionId/history')
  // @Audit('VIEW_SUBSCRIPTION_HISTORY')
  async getSubscriptionHistory(
    @Param('subscriptionId') subscriptionId: string,
  ) {
    if (!subscriptionId)
      throw new BadRequestException('Subscription ID is required');
    return this.paymentsService.getSubscriptionHistory(subscriptionId);
  }

  // ─── Global Invoices ──────────────────────────────────────────────────────

  @Get('invoices/stats')
  // @Audit('VIEW_GLOBAL_INVOICE_STATS')
  async getGlobalInvoiceStats() {
    return this.paymentsService.getInvoiceStats();
  }

  @Get('invoices/:invoiceId')
  // @Audit('VIEW_INVOICE')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    if (!invoiceId) throw new BadRequestException('Invoice ID is required');
    return this.paymentsService.getInvoice(invoiceId);
  }

  // ─── Payout Info ─────────────────────────────────────────────────────────

  @Get('payout-info')
  // @Audit('VIEW_ALL_PAYOUT_INFO')
  async getAllPayoutInfo(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllPayoutInfo(limit, cursor);
  }

  @Get('banks')
  // @Audit('VIEW_BANKS')
  async getBanks() {
    return this.paymentsService.getBanks();
  }

  // ─── Add-Ons ─────────────────────────────────────────────────────────────

  @Get('add-ons')
  // @Audit('VIEW_ALL_ADD_ONS')
  async getAllAddOns(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.paymentsService.getAllAddOns(limit, cursor);
  }

  // ─── Per-Business Routes ──────────────────────────────────────────────────

  @Get(':id')
  // @Audit('VIEW_BUSINESS_PAYMENT_DETAILS')
  async getBusiness(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusiness(id);
  }

  @Get(':id/subscription')
  // @Audit('VIEW_BUSINESS_SUBSCRIPTION')
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
  // @Audit('VIEW_BUSINESS_PAYMENTS')
  async getPayments(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getPayments(id);
  }

  @Get(':id/payments/failed')
  // @Audit('VIEW_BUSINESS_FAILED_PAYMENTS')
  async getFailedPayments(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getFailedPayments(id);
  }

  @Get(':id/invoices')
  // @Audit('VIEW_BUSINESS_INVOICES')
  async getBusinessInvoices(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessInvoices(id, {
      limit,
      cursor,
      paymentStatus,
    });
  }

  @Get(':id/invoices/stats')
  // @Audit('VIEW_BUSINESS_INVOICE_STATS')
  async getBusinessInvoiceStats(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getInvoiceStats(id);
  }

  @Get(':id/disputes')
  // @Audit('VIEW_BUSINESS_DISPUTES')
  async getDisputes(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getDisputes(businessId);
  }

  @Get(':id/payout-info')
  // @Audit('VIEW_BUSINESS_PAYOUT_INFO')
  async getBusinessPayoutInfo(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessPayoutInfo(businessId);
  }

  @Get(':id/add-ons')
  // @Audit('VIEW_BUSINESS_ADD_ONS')
  async getBusinessAddOns(@Param('id') businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    return this.paymentsService.getBusinessAddOns(businessId);
  }

  @Get(':id/clients')
  // @Audit('VIEW_BUSINESS_CLIENTS')
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

  @Post('subscriptions/create')
  @Audit('CREATE_SUBSCRIPTION')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() createDto: CreateSubscriptionDto) {
    return this.paymentsService.createSubscription(createDto);
  }

  @Post('subscriptions/checkout-session')
  @Audit('CREATE_CHECKOUT_SESSION')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Body()
    body: {
      businessId: string;
      subscriptionId: string;
      billingCycle: BillingCycle;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const { businessId, subscriptionId, billingCycle, successUrl, cancelUrl } =
      body;

    if (
      !businessId ||
      !subscriptionId ||
      !billingCycle ||
      !successUrl ||
      !cancelUrl
    ) {
      throw new BadRequestException('Missing required fields');
    }

    return this.paymentsService.createCheckoutSession(
      businessId,
      subscriptionId,
      billingCycle,
      successUrl,
      cancelUrl,
    );
  }

  @Post('subscriptions/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: any,
    // @Headers('stripe-signature') signature: string,
  ) {
    // You'd verify the webhook signature here
    const event = body;

    switch (event.type) {
      case 'checkout.session.completed':
        // Handle checkout completion
        break;
      case 'customer.subscription.created':
        await this.paymentsService.handleSuccessfulSubscription(
          event.data.object,
        );
        break;
      case 'customer.subscription.updated':
        // Handle subscription updates
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellations
        break;
    }

    return { received: true };
  }
}
