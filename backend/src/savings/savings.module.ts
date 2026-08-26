import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsModule } from '../goals/goals.module';
import { AnchorController } from './anchor.controller';
import { AnchorService } from './anchor.service';
import { AnchorDeposit } from './entities/anchor-deposit.entity';
import { Balance } from './entities/balance.entity';
import { Group } from './entities/group.entity';
import { BalanceService } from './balance.service';
import { BalanceController } from './balance.controller';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnchorDeposit, Balance, Group]),
    GoalsModule,
  ],
  controllers: [AnchorController, BalanceController, SavingsController],
  providers: [AnchorService, BalanceService, SavingsService],
  exports: [AnchorService, BalanceService, SavingsService],
})
export class SavingsModule {}
