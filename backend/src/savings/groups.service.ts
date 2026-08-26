import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';

/**
 * Projects the vault contract's group-split-settlement event into the
 * `groups` read-model.
 */
@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  /** Marks a group settled and zeroes its projected balance. Idempotent. */
  async markSettled(
    onChainId: string,
  ): Promise<{ group: Group; changed: boolean }> {
    let group = await this.groupRepository.findOne({
      where: { on_chain_id: onChainId },
    });
    if (!group) {
      group = this.groupRepository.create({
        on_chain_id: onChainId,
        balance: '0',
        settled: false,
        settled_at: null,
      });
    }
    if (group.settled) {
      return { group, changed: false };
    }
    group.settled = true;
    group.settled_at = new Date();
    group.balance = '0';
    const saved = await this.groupRepository.save(group);
    return { group: saved, changed: true };
  }
}
