import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1727837325044 implements MigrationInterface {
  name = 'InitialSchema1727837325044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stadium" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "full_name" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, CONSTRAINT "UQ_c14b0495f7e40f2edfa6f0589d4" UNIQUE ("name"), CONSTRAINT "PK_e1fec3f13003877cd87a990655d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "game" ("id" character varying NOT NULL, "date" date NOT NULL, "time" TIME NOT NULL, "status" character varying NOT NULL, "home_team_score" integer, "away_team_score" integer, "home_team_id" integer, "away_team_id" integer, "winning_team_id" integer, "stadium_id" integer, CONSTRAINT "UQ_97f4bd80235a27e070fa9f29011" UNIQUE ("date", "time", "stadium_id"), CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "registered_game" ("id" SERIAL NOT NULL, "image" character varying, "seat" character varying NOT NULL, "review" text NOT NULL, "status" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "game_id" character varying, "user_id" integer, "cheering_team_id" integer, CONSTRAINT "UQ_5e7d73a36830940738a6c8794d6" UNIQUE ("game_id", "user_id"), CONSTRAINT "PK_c6a3f7d196b09e9b6b796f96ab3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "player" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "jersey_number" integer NOT NULL, "position" character varying NOT NULL, "throws_bats" character varying NOT NULL, "team_id" integer, CONSTRAINT "UQ_56c105d12349d151dba09d50bd9" UNIQUE ("name", "jersey_number"), CONSTRAINT "PK_65edadc946a7faf4b638d5e8885" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "like_cheering_song" ("id" SERIAL NOT NULL, "user_id" integer, "cheering_song_id" integer, CONSTRAINT "PK_25455805e66e5361e75cd58b461" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cheering_song" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "title" character varying, "lyrics" text NOT NULL, "link" character varying NOT NULL, "team_id" integer, "player_id" integer, CONSTRAINT "UQ_68aeeda4a71477121bfd8509568" UNIQUE ("link"), CONSTRAINT "PK_45bb5b402a949b11e58d44f5c9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "team" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_cf461f5b40cf1a2b8876011e1e1" UNIQUE ("name"), CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rank" ("id" SERIAL NOT NULL, "team_id" integer NOT NULL, "win" integer NOT NULL DEFAULT '0', "lose" integer NOT NULL DEFAULT '0', "tie" integer NOT NULL DEFAULT '0', "cancel" integer NOT NULL DEFAULT '0', "active_year" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "UQ_e94dadcf25ed71c12c4952eda34" UNIQUE ("team_id", "user_id", "active_year"), CONSTRAINT "PK_a5dfd2e605e5e4fb8578caec083" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "profile_image" character varying NOT NULL, "nickname" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "support_team_id" integer, CONSTRAINT "UQ_e2364281027b926b879fa2fa1e0" UNIQUE ("nickname"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "parking_info" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "address" character varying NOT NULL, "link" character varying NOT NULL, "stadiumId" integer, CONSTRAINT "UQ_c484ff3c97ee25504beb113686b" UNIQUE ("name"), CONSTRAINT "PK_22499ee4971c392f04cffdbb533" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_b070e4ba3298505350f0be9cd2f" FOREIGN KEY ("home_team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_e0e1c5181941b3222eb702e8e71" FOREIGN KEY ("away_team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_a766733772adcdf56fa83625af3" FOREIGN KEY ("winning_team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_896d7b1919c5439788668543801" FOREIGN KEY ("stadium_id") REFERENCES "stadium"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registered_game" ADD CONSTRAINT "FK_eec00b3ae59a8b3eb624616f7a9" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registered_game" ADD CONSTRAINT "FK_084d39c837e3e21fa624dd48ddd" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registered_game" ADD CONSTRAINT "FK_c5a3a2d935e17cf4bca2d6d252e" FOREIGN KEY ("cheering_team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player" ADD CONSTRAINT "FK_9deb77a11ad43ce17975f13dc85" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "like_cheering_song" ADD CONSTRAINT "FK_2a7aea37dd026d37aa58420ce5d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "like_cheering_song" ADD CONSTRAINT "FK_fe728f91fef650afa78b0a9665f" FOREIGN KEY ("cheering_song_id") REFERENCES "cheering_song"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cheering_song" ADD CONSTRAINT "FK_89f83b2f7c027609b438e3c905b" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cheering_song" ADD CONSTRAINT "FK_088cd62c81e11bf5dbdbd6a2743" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rank" ADD CONSTRAINT "FK_381ac7a880ad7b8804e87f01d07" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_45278f001117d8f457aa1b8275a" FOREIGN KEY ("support_team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parking_info" ADD CONSTRAINT "FK_90ec7b46af3880a171edc3eb20d" FOREIGN KEY ("stadiumId") REFERENCES "stadium"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
