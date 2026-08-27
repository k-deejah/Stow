import { Test, TestingModule } from '@nestjs/testing';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { GoalsService } from '../goals/goals.service';
import { LockedPlansService } from './locked-plans.service';

describe('SavingsController', () => {
  let controller: SavingsController;
  let goalsService: { listByOwnerPaginated: jest.Mock };
  let lockedPlansService: { listByOwner: jest.Mock };

  beforeEach(async () => {
    goalsService = { listByOwnerPaginated: jest.fn() };
    lockedPlansService = { listByOwner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavingsController],
      providers: [
        SavingsService,
        { provide: GoalsService, useValue: goalsService },
        { provide: LockedPlansService, useValue: lockedPlansService },
      ],
    }).compile();

    controller = module.get<SavingsController>(SavingsController);
  });

  describe('ping', () => {
    it('responds with an ok status', () => {
      expect(controller.ping()).toEqual({ status: 'ok' });
    });
  });

  describe('listGoals', () => {
    it('shapes the paginated service result into ListGoalsDto', async () => {
      goalsService.listByOwnerPaginated.mockResolvedValue({
        data: [{ on_chain_id: 'g1', owner: 'GADDR', name: 'Trip', target_amount: '100', current_amount: '40', status: 'active' }],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await controller.listGoals('GADDR', 1, 20);

      expect(goalsService.listByOwnerPaginated).toHaveBeenCalledWith('GADDR', 1, 20);
      expect(result).toEqual({
        address: 'GADDR',
        goals: [{ on_chain_id: 'g1', owner: 'GADDR', name: 'Trip', target_amount: '100', current_amount: '40', status: 'active' }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('coerces string query params to numbers before calling the service', async () => {
      goalsService.listByOwnerPaginated.mockResolvedValue({ data: [], total: 0, page: 2, limit: 5 });

      await controller.listGoals('GADDR', '2' as unknown as number, '5' as unknown as number);

      expect(goalsService.listByOwnerPaginated).toHaveBeenCalledWith('GADDR', 2, 5);
    });
  });

  describe('listLocked', () => {
    it('shapes the paginated service result into ListLockedDto', async () => {
      lockedPlansService.listByOwner.mockResolvedValue({
        data: [{ on_chain_id: 'p1', owner: 'GADDR', balance: '500', unlock_at: new Date('2030-01-01') }],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await controller.listLocked('GADDR', 1, 20);

      expect(lockedPlansService.listByOwner).toHaveBeenCalledWith('GADDR', 1, 20);
      expect(result).toEqual({
        address: 'GADDR',
        plans: [{ on_chain_id: 'p1', owner: 'GADDR', balance: '500', unlock_at: new Date('2030-01-01') }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });
});
