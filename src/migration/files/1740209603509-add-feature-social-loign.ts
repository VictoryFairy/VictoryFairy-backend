import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialAuthAndLocalAuth1740209603509
  implements MigrationInterface
{
  name = 'AddSocialAuthAndLocalAuth1740209603509';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "local_auth" ("user_id" integer NOT NULL, "password" character varying NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_59f58ddc8b6c54911cf63a8324f" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "social_auth" ("id" SERIAL NOT NULL, "provider" character varying(15) NOT NULL, "sub" character varying NOT NULL, "provider_email" character varying(100) NOT NULL, "user_id" integer NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_4444ace7e09dc0172bc0ac5329a" UNIQUE ("sub", "provider"), CONSTRAINT "PK_9cd70d00d72575226868164eb61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08ec54f5ff69d5350788315e46" ON "social_auth" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "local_auth" ADD CONSTRAINT "FK_59f58ddc8b6c54911cf63a8324f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_auth" ADD CONSTRAINT "FK_08ec54f5ff69d5350788315e46d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "social_auth" DROP CONSTRAINT "FK_08ec54f5ff69d5350788315e46d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "local_auth" DROP CONSTRAINT "FK_59f58ddc8b6c54911cf63a8324f"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "is_active"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08ec54f5ff69d5350788315e46"`,
    );
    await queryRunner.query(`DROP TABLE "social_auth"`);
    await queryRunner.query(`DROP TABLE "local_auth"`);
  }
}
