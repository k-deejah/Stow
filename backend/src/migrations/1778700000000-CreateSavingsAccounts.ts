import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `savings_accounts` read-model table projected by the indexer
 * from the vault contract's flexible deposit and withdraw events.
 * One row per owner address — upserted as events arrive.
 */
export class CreateSavingsAccounts1778700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'savings_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
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
      'savings_accounts',
      new TableIndex({
        name: 'UQ_savings_accounts_owner',
        columnNames: ['owner'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'savings_accounts',
      new TableIndex({
        name: 'IDX_savings_accounts_owner',
        columnNames: ['owner'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('savings_accounts', true);
  }
}
