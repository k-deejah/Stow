import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SorobanListener } from './soroban.listener';
import { SorobanService, SorobanRpcEvent } from './soroban.service';
import { SystemState } from './entities/system-state.entity';
import { SavingsProjectionService } from '../savings-projection/savings-projection.service';

describe('SorobanListener', () => {
  let listener: SorobanListener;
  let sorobanService: { getEvents: jest.Mock };
  let savingsProjectionService: { apply: jest.Mock };
  let systemStateRepo: { findOne: jest.Mock; save: jest.Mock };

  const originalContractId = process.env.SOROBAN_CONTRACT_ID;

  beforeEach(async () => {
    process.env.SOROBAN_CONTRACT_ID = 'CVALIDCONTRACT';

    sorobanService = { getEvents: jest.fn() };
    savingsProjectionService = {
      apply: jest.fn().mockResolvedValue(undefined),
    };
    systemStateRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanListener,
        { provide: SorobanService, useValue: sorobanService },
        {
          provide: SavingsProjectionService,
          useValue: savingsProjectionService,
        },
        { provide: getRepositoryToken(SystemState), useValue: systemStateRepo },
      ],
    }).compile();

    listener = module.get<SorobanListener>(SorobanListener);
  });

  afterEach(() => {
    process.env.SOROBAN_CONTRACT_ID = originalContractId;
  });

  it('dispatches each event to the savings projection exactly once', async () => {
    const events: SorobanRpcEvent[] = [
      {
        id: 'evt-1',
        ledger: 10,
        topic: ['deposit'],
        value: { owner: 'GALICE', amount: '100' },
      },
      {
        id: 'evt-2',
        ledger: 11,
        topic: ['goal_reached'],
        value: { id: 'goal-1' },
      },
    ];
    sorobanService.getEvents.mockResolvedValue({ events, latestLedger: 11 });

    await listener.pollEvents();

    expect(savingsProjectionService.apply).toHaveBeenCalledTimes(2);
    expect(savingsProjectionService.apply).toHaveBeenNthCalledWith(
      1,
      'deposit',
      {
        owner: 'GALICE',
        amount: '100',
      },
    );
    expect(savingsProjectionService.apply).toHaveBeenNthCalledWith(
      2,
      'goal_reached',
      {
        id: 'goal-1',
      },
    );
  });

  it('advances and persists the ledger checkpoint after processing', async () => {
    sorobanService.getEvents.mockResolvedValue({
      events: [{ id: 'evt-1', ledger: 42, topic: ['deposit'], value: {} }],
      latestLedger: 42,
    });

    await listener.pollEvents();

    expect(systemStateRepo.save).toHaveBeenCalledWith({
      key: 'soroban:last_processed_ledger',
      value: '42',
    });
  });

  it('does not reprocess events once the ledger checkpoint has moved past them', async () => {
    systemStateRepo.findOne.mockResolvedValue({
      key: 'soroban:last_processed_ledger',
      value: '42',
    });
    sorobanService.getEvents.mockResolvedValue({
      events: [],
      latestLedger: 42,
    });

    await listener.pollEvents();

    expect(sorobanService.getEvents).toHaveBeenCalledWith(43);
    expect(savingsProjectionService.apply).not.toHaveBeenCalled();
  });

  it('skips polling when the contract id is not configured', async () => {
    process.env.SOROBAN_CONTRACT_ID = 'your-contract-id-here';

    await listener.pollEvents();

    expect(sorobanService.getEvents).not.toHaveBeenCalled();
  });
});
