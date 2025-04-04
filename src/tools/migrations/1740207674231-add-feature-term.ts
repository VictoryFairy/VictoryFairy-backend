import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermFeature1740207674231 implements MigrationInterface {
  name = 'AddTermFeature1740207674231';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "term" ("id" character varying NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "version" character varying(50) NOT NULL, "is_required" boolean NOT NULL, "is_active" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_55b0479f0743f2e5d5ec414821e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_term" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "term_id" character varying NOT NULL, "agreed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0b52c74d33ffa4ea6a80c579811" PRIMARY KEY ("id"), CONSTRAINT "UQ_user_term_user_id_term_id" UNIQUE ("user_id", "term_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_term" ADD CONSTRAINT "FK_618bf2611fd6a7dbaf5eb271553" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_term" ADD CONSTRAINT "FK_993b1d53c57e253630fbc7c7383" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_term" DROP CONSTRAINT "FK_993b1d53c57e253630fbc7c7383"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_term" DROP CONSTRAINT "FK_618bf2611fd6a7dbaf5eb271553"`,
    );
    await queryRunner.query(`DROP TABLE "user_term"`);
    await queryRunner.query(`DROP TABLE "term"`);
  }
}
