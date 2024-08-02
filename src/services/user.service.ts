import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    const user = new User();
    user.email = 'example@example.com';
    user.password = 'should be hidden';
    user.nickname = 'nickname example';
    user.profile_image = 'url/to/example/image';
    user.score = 0;

    const exampleCheeringTeam = new Team();
    exampleCheeringTeam.id = 1;
    exampleCheeringTeam.name = 'example';
    user.cheering_team = exampleCheeringTeam;
    
    await this.userRepository.insert(user);
    this.logger.log('test user 1 is created');
  }
}
