import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Creates the `groups` read-model table projected by the indexer from the
 * vault contract's `group_created`, `group_joined`, `group_contribution`,
 * and `group_closed` events.
 *
 * `members` is a Postgres `text[]`; membership is queried with
 * `WHERE :address = ANY(members)`, which is backed by the GIN index
 * created below (a plain btree index would not support that access
 * pattern efficiently).
 */
export class CreateGroups1778400000000 implements MigrationInterface {
  name = 'CreateGroups1778400000000';

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
            name: 'creator',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'members',
            type: 'text',
            isArray: true,
            default: "'{}'",
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'varchar',
            default: "'0'",
            isNullable: false,
          },
          {
            name: 'open',
            type: 'boolean',
            default: true,
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
      'groups',
      new TableIndex({
        name: 'UQ_groups_on_chain_id',
        columnNames: ['on_chain_id'],
        isUnique: true,
      }),
    );

    // GIN index to support `WHERE :address = ANY(members)` membership
    // lookups (see GET /savings/groups?address=).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_groups_members"
        ON "groups" USING GIN ("members")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_groups_members"`);
    await queryRunner.dropTable('groups', true);
  }
}
