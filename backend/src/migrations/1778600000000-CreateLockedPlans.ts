import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `locked_plans` read-model table projected by the indexer
 * from the vault contract's locked (create/top_up/withdraw) events.
 */
export class CreateLockedPlans1778600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'locked_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'on_chain_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'owner',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'varchar',
            default: "'0'",
            isNullable: false,
          },
          {
            name: 'unlock_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'locked_plans',
      new TableIndex({
        name: 'UQ_locked_plans_on_chain_id',
        columnNames: ['on_chain_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'locked_plans',
      new TableIndex({
        name: 'IDX_locked_plans_owner',
        columnNames: ['owner'],
      }),
    );

    await queryRunner.createIndex(
      'locked_plans',
      new TableIndex({
        name: 'IDX_locked_plans_unlock_at',
        columnNames: ['unlock_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('locked_plans', true);
  }
}
