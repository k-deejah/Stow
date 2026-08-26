import { LockedPlan } from './locked-plan.entity';

describe('LockedPlan Entity', () => {
  it('stores and reads back all fields as assigned', () => {
    const plan = new LockedPlan();
    plan.on_chain_id = '42';
    plan.owner = 'GABC123456789DEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890';
    plan.balance = '100000000';
    plan.unlock_at = new Date('2027-01-01T00:00:00.000Z');

    expect(plan.on_chain_id).toBe('42');
    expect(plan.owner).toBe(
      'GABC123456789DEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890',
    );
    expect(plan.balance).toBe('100000000');
    expect(plan.unlock_at).toEqual(new Date('2027-01-01T00:00:00.000Z'));
  });

  it('has an id and timestamp fields available for TypeORM to populate', () => {
    const plan = new LockedPlan();

    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('created_at');
    expect(plan).toHaveProperty('updated_at');
  });

  it('does not leak field values across separate instances', () => {
    const planA = new LockedPlan();
    const planB = new LockedPlan();

    planA.on_chain_id = 'plan-a';
    planA.owner = 'owner-a';
    planB.on_chain_id = 'plan-b';
    planB.owner = 'owner-b';

    expect(planA.on_chain_id).toBe('plan-a');
    expect(planA.owner).toBe('owner-a');
    expect(planB.on_chain_id).toBe('plan-b');
    expect(planB.owner).toBe('owner-b');
  });
});
