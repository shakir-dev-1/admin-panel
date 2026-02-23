// src/admin/dto/create-subscription.dto.ts
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { BillingCycle } from '../../generated/prisma/enums.js';

export class CreateSubscriptionDto {
  @IsUUID()
  businessId: string;

  @IsUUID()
  subscriptionId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  trialPeriodDays?: number;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string;

  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    businessId: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: BillingCycle;
    startDate: Date | null;
    endDate: Date | null;
    stripeSubscriptionId: string | null;
    amount: number;
    currency: string;
  };
  stripeData?: any;
}
