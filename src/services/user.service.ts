import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async isExistEmail(email: string) {
    return this.userRepository.exists({ where: { email } });
  }

  async isExistNickname(nickname: string) {
    return this.userRepository.exists({ where: { nickname } });
  }

  async findUserById(userId: number) {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async createUser(dto: CreateUserDto) {
    const { email, image, nickname, password, teamId } = dto;

    const hashPw = await bcrypt.hash(password, 10);
    const result = await this.userRepository.insert({
      email,
      profile_image: image,
      support_team: { id: teamId },
      nickname,
      password: hashPw,
    });

    return { id: result.identifiers[0].id };
  }
}
