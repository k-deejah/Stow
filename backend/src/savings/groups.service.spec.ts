import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    groupRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ id: 'uuid-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: groupRepo },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  describe('markSettled', () => {
    it('creates and settles a group not seen before, zeroing its balance', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      const { group, changed } = await service.markSettled('group-1');

      expect(changed).toBe(true);
      expect(group.settled).toBe(true);
      expect(group.balance).toBe('0');
      expect(group.settled_at).toBeInstanceOf(Date);
      expect(groupRepo.save).toHaveBeenCalledTimes(1);
    });

    it('settles an existing unsettled group and zeroes its balance', async () => {
      groupRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        on_chain_id: 'group-1',
        balance: '5000',
        settled: false,
        settled_at: null,
      });

      const { group, changed } = await service.markSettled('group-1');

      expect(changed).toBe(true);
      expect(group.settled).toBe(true);
      expect(group.balance).toBe('0');
    });

    it('is idempotent: a second settlement is a no-op', async () => {
      const settledAt = new Date('2026-01-01T00:00:00Z');
      groupRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        on_chain_id: 'group-1',
        balance: '0',
        settled: true,
        settled_at: settledAt,
      });

      const { group, changed } = await service.markSettled('group-1');

      expect(changed).toBe(false);
      expect(group.settled_at).toBe(settledAt);
      expect(groupRepo.save).not.toHaveBeenCalled();
    });
  });
});
