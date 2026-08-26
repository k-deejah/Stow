import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Creates the `groups` read-model table projected by the indexer from the
 * vault contract's `group_split_settled` event.
 */
export class CreateGroups1778500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'groups',
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
            name: 'balance',
            type: 'varchar',
            default: "'0'",
            isNullable: false,
          },
          {
            name: 'settled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'settled_at',
            type: 'timestamptz',
            isNullable: true,
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
      'groups',
      new TableIndex({
        name: 'UQ_groups_on_chain_id',
        columnNames: ['on_chain_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('groups', true);
  }
}
