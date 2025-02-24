import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovePwToLocalAuth1740378618047 implements MigrationInterface {
  name = 'MovePwToLocalAuth1740378618047';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // user의 password 데이터 local_auth로 옮기기
    await queryRunner.query(
      `INSERT INTO local_auth (user_id, password) SELECT id, password FROM "user" ON CONFLICT (user_id) DO UPDATE SET password = EXCLUDED.password;`,
    );

    // user의 password 컬럼 삭제
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // user의 password 컬럼 추가
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "password" character varying`,
    );
    // local_auth 비밀번호 데이터 user로 복구
    await queryRunner.query(
      `UPDATE "user" SET "password" = local_auth.password FROM local_auth WHERE "user".id = local_auth.user_id`,
    );

    // local_auth 데이터 지우기
    await queryRunner.query(
      `DELETE FROM local_auth WHERE user_id IN (SELECT id FROM "user")`,
    );
  }
}
