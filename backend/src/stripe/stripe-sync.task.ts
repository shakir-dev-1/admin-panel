// src/tasks/stripe-sync.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StripeSyncService } from './stripe-sync.service.js';

@Injectable()
export class StripeSyncTask {
  private readonly logger = new Logger(StripeSyncTask.name);

  constructor(private readonly stripeSyncService: StripeSyncService) {}

  // Sync daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailySync() {
    this.logger.log('Starting daily Stripe transaction sync');
    try {
      const result = await this.stripeSyncService.syncRecentTransactions(1); // Sync last day
      this.logger.log(`Daily sync completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Daily sync failed:', error);
    }
  }

  // Fix stale transactions every 6 hours
  @Cron(CronExpression.EVERY_6_HOURS)
  async fixStaleData() {
    this.logger.log('Checking for stale transactions');
    try {
      const result = await this.stripeSyncService.fixStaleTransactions(24);
      this.logger.log(`Stale check completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Stale check failed:', error);
    }
  }
}