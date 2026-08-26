import { Module } from '@nestjs/common';
import { SavingsProjectionService } from './savings-projection.service';
import { GoalsModule } from '../goals/goals.module';
import { SavingsModule } from '../savings/savings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GoalsModule, SavingsModule, NotificationsModule],
  providers: [SavingsProjectionService],
  exports: [SavingsProjectionService],
})
export class SavingsProjectionModule {}
