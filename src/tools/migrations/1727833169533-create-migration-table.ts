import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMigrationTable1727833169533 implements MigrationInterface {
  name = 'CreateMigrationTable1727833169533';
  public async up(queryRunner: QueryRunner): Promise<void> {}

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
