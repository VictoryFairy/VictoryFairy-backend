import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermFeature1730299146482 implements MigrationInterface {
  name = 'AddTermFeature1730299146482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "term" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "type" character varying NOT NULL, "version" character varying NOT NULL, "is_required" boolean NOT NULL, "is_active" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_55b0479f0743f2e5d5ec414821e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "UserTerm" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "term_id" integer NOT NULL, "agreed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_14502a508de697092d55212a028" UNIQUE ("user_id", "term_id"), CONSTRAINT "PK_580934b252de1713b03607e5500" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserTerm" ADD CONSTRAINT "FK_95514f04714af87f1f0484cea6e" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserTerm" ADD CONSTRAINT "FK_1e8f2ae2e5bc60397774975b9b6" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "UserTerm" DROP CONSTRAINT "FK_1e8f2ae2e5bc60397774975b9b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserTerm" DROP CONSTRAINT "FK_95514f04714af87f1f0484cea6e"`,
    );
    await queryRunner.query(`DROP TABLE "UserTerm"`);
    await queryRunner.query(`DROP TABLE "term"`);
  }
}
