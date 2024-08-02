import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UserController } from 'src/controllers/user.controller';
import { UserService } from 'src/services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { AwsS3Module } from './aws-s3.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User]), AwsS3Module],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
