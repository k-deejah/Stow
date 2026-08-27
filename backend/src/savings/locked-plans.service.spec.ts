import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LockedPlan } from './entities/locked-plan.entity';
import { LockedPlansService } from './locked-plans.service';

/**
 * In-memory stand-in for the TypeORM `Repository<LockedPlan>`, supporting
 * just the `findAndCount` call `LockedPlansService` makes — filtered by
 * `owner`, ordered by `unlock_at` ascending, sliced by `skip`/`take`.
 */
class FakeLockedPlanRepository {
  private readonly rows: LockedPlan[] = [];

  seed(rows: LockedPlan[]): void {
    this.rows.push(...rows);
  }

  async findAndCount(options: {
    where: { owner: string };
    order: { unlock_at: 'ASC' | 'DESC' };
    skip: number;
    take: number;
  }): Promise<[LockedPlan[], number]> {
    const filtered = this.rows.filter((r) => r.owner === options.where.owner);
    const sorted = [...filtered].sort((a, b) =>
      options.order.unlock_at === 'ASC'
        ? a.unlock_at.getTime() - b.unlock_at.getTime()
        : b.unlock_at.getTime() - a.unlock_at.getTime(),
    );
    const page = sorted.slice(options.skip, options.skip + options.take);
    return [page, filtered.length];
  }
}

function makePlan(overrides: Partial<LockedPlan>): LockedPlan {
  return {
    id: 'id',
    on_chain_id: 'chain-id',
    owner: 'GOWNER',
    balance: '0',
    unlock_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as LockedPlan;
}

describe('LockedPlansService', () => {
  let service: LockedPlansService;
  let repository: FakeLockedPlanRepository;

  beforeEach(async () => {
    repository = new FakeLockedPlanRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockedPlansService,
        { provide: getRepositoryToken(LockedPlan), useValue: repository },
      ],
    }).compile();

    service = module.get<LockedPlansService>(LockedPlansService);
  });

  it("returns only the caller's plans, ordered by unlock_at ascending", async () => {
    repository.seed([
      makePlan({ on_chain_id: 'p1', owner: 'GOWNER', unlock_at: new Date('2030-06-01') }),
      makePlan({ on_chain_id: 'p2', owner: 'GOWNER', unlock_at: new Date('2030-01-01') }),
      makePlan({ on_chain_id: 'p3', owner: 'GOTHER', unlock_at: new Date('2029-01-01') }),
    ]);

    const result = await service.listByOwner('GOWNER');

    expect(result.data.map((p) => p.on_chain_id)).toEqual(['p2', 'p1']);
    expect(result.total).toBe(2);
  });

  it('paginates correctly across pages', async () => {
    repository.seed(
      Array.from({ length: 25 }, (_, i) =>
        makePlan({
          on_chain_id: `p${i}`,
          owner: 'GOWNER',
          unlock_at: new Date(2030, 0, i + 1),
        }),
      ),
    );

    const page1 = await service.listByOwner('GOWNER', 1, 10);
    const page2 = await service.listByOwner('GOWNER', 2, 10);
    const page3 = await service.listByOwner('GOWNER', 3, 10);

    expect(page1.data).toHaveLength(10);
    expect(page2.data).toHaveLength(10);
    expect(page3.data).toHaveLength(5);
    expect(page1.total).toBe(25);
    expect(page1.data[0].on_chain_id).toBe('p0');
    expect(page2.data[0].on_chain_id).toBe('p10');
    expect(page1.data.map((p) => p.on_chain_id)).not.toEqual(
      page2.data.map((p) => p.on_chain_id),
    );
  });

  it('caps limit at 100 even when a larger value is requested', async () => {
    repository.seed(
      Array.from({ length: 5 }, (_, i) =>
        makePlan({ on_chain_id: `p${i}`, owner: 'GOWNER', unlock_at: new Date(2030, 0, i + 1) }),
      ),
    );

    const result = await service.listByOwner('GOWNER', 1, 500);

    expect(result.limit).toBe(100);
  });

  it('returns an empty page for an owner with no plans', async () => {
    const result = await service.listByOwner('GNOBODY');
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });
});
