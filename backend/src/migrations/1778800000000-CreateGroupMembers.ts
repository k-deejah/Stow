import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Adds membership fields to `groups` (creator, name, open) and creates the
 * `group_members` table, projected by the indexer from the vault
 * contract's `group_join` and `group_set_shares` events.
 *
 * `group_members` is indexed on `address` so a member's groups can be
 * queried directly, and uniquely constrained on `(group_id, address)` so
 * re-delivering a `group_join` event is a safe no-op upsert.
 */
export class CreateGroupMembers1778800000000 implements MigrationInterface {
  name = 'CreateGroupMembers1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('groups', [
      new TableColumn({ name: 'creator', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'name', type: 'varchar', isNullable: true }),
      new TableColumn({
        name: 'open',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'group_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'group_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'share_bps',
            type: 'integer',
            default: 0,
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

    await queryRunner.createForeignKey(
      'group_members',
      new TableForeignKey({
        name: 'FK_group_members_group_id',
        columnNames: ['group_id'],
        referencedTableName: 'groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'group_members',
      new TableIndex({
        name: 'UQ_group_members_group_id_address',
        columnNames: ['group_id', 'address'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'group_members',
      new TableIndex({
        name: 'IDX_group_members_address',
        columnNames: ['address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('group_members', true);
    await queryRunner.dropColumn('groups', 'open');
    await queryRunner.dropColumn('groups', 'name');
    await queryRunner.dropColumn('groups', 'creator');
  }
}
