import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let memberRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    groupRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ id: 'uuid-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    memberRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'member-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: groupRepo },
        { provide: getRepositoryToken(GroupMember), useValue: memberRepo },
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

  describe('upsertCreated', () => {
    it('creates a new group with the given creator and name', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      const group = await service.upsertCreated({
        onChainId: 'group-1',
        creator: 'GCREATOR1',
        name: 'Vacation Fund',
      });

      expect(group.on_chain_id).toBe('group-1');
      expect(group.creator).toBe('GCREATOR1');
      expect(group.name).toBe('Vacation Fund');
      expect(group.open).toBe(true);
      expect(groupRepo.save).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: returns the existing group without saving again', async () => {
      const existing = {
        id: 'uuid-1',
        on_chain_id: 'group-1',
        creator: 'GCREATOR1',
        name: 'Vacation Fund',
      };
      groupRepo.findOne.mockResolvedValue(existing);

      const group = await service.upsertCreated({
        onChainId: 'group-1',
        creator: 'GCREATOR1',
        name: 'Vacation Fund',
      });

      expect(group).toBe(existing);
      expect(groupRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    const existingGroup = { id: 'uuid-1', on_chain_id: 'group-1' };

    it('adds a new member with a zero share', async () => {
      groupRepo.findOne.mockResolvedValue(existingGroup);
      memberRepo.findOne.mockResolvedValue(null);

      const member = await service.addMember('group-1', 'GMEMBER1');

      expect(member.group_id).toBe('uuid-1');
      expect(member.address).toBe('GMEMBER1');
      expect(member.share_bps).toBe(0);
      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: joining twice leaves the existing row untouched', async () => {
      groupRepo.findOne.mockResolvedValue(existingGroup);
      const existingMember = {
        id: 'member-1',
        group_id: 'uuid-1',
        address: 'GMEMBER1',
        share_bps: 2500,
      };
      memberRepo.findOne.mockResolvedValue(existingMember);

      const member = await service.addMember('group-1', 'GMEMBER1');

      expect(member).toBe(existingMember);
      expect(memberRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the group does not exist', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('missing-group', 'GMEMBER1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setShares', () => {
    const existingGroup = { id: 'uuid-1', on_chain_id: 'group-1' };

    it('sets share_bps for each address, creating members not yet projected', async () => {
      groupRepo.findOne.mockResolvedValue(existingGroup);
      memberRepo.findOne.mockResolvedValue(null);

      const results = await service.setShares('group-1', {
        GMEMBER1: 6000,
        GMEMBER2: 4000,
      });

      expect(results).toHaveLength(2);
      expect(results[0].share_bps).toBe(6000);
      expect(results[1].share_bps).toBe(4000);
      expect(memberRepo.save).toHaveBeenCalledTimes(2);
    });

    it('updates share_bps for an already-projected member', async () => {
      groupRepo.findOne.mockResolvedValue(existingGroup);
      const existingMember = {
        id: 'member-1',
        group_id: 'uuid-1',
        address: 'GMEMBER1',
        share_bps: 0,
      };
      memberRepo.findOne.mockResolvedValue(existingMember);

      const [result] = await service.setShares('group-1', { GMEMBER1: 10000 });

      expect(result.share_bps).toBe(10000);
    });

    it('throws NotFoundException when the group does not exist', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setShares('missing-group', { GMEMBER1: 5000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('returns members of the group ordered most-recent first', async () => {
      groupRepo.findOne.mockResolvedValue({ id: 'uuid-1' });
      const members = [{ address: 'GMEMBER2' }, { address: 'GMEMBER1' }];
      memberRepo.find.mockResolvedValue(members);

      const result = await service.listMembers('group-1');

      expect(result).toBe(members);
      expect(memberRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { group_id: 'uuid-1' },
          order: { created_at: 'DESC' },
        }),
      );
    });

    it('throws NotFoundException when the group does not exist', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.listMembers('missing-group')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listGroupsForAddress', () => {
    it('returns the groups an address is a member of', async () => {
      const groupA = { id: 'uuid-a', on_chain_id: 'group-a' };
      const groupB = { id: 'uuid-b', on_chain_id: 'group-b' };
      memberRepo.find.mockResolvedValue([
        { address: 'GMEMBER1', group: groupA },
        { address: 'GMEMBER1', group: groupB },
      ]);

      const result = await service.listGroupsForAddress('GMEMBER1');

      expect(result).toEqual([groupA, groupB]);
      expect(memberRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { address: 'GMEMBER1' },
          relations: ['group'],
        }),
      );
    });

    it('returns an empty array when the address is not a member of any group', async () => {
      memberRepo.find.mockResolvedValue([]);

      const result = await service.listGroupsForAddress('GNOBODY');

      expect(result).toEqual([]);
    });
  });
});
