import { IsNotEmpty } from 'class-validator';
import { RegisteredGameWithGameDto } from './registered-game-with-game.dto';
import { Type } from 'class-transformer';
import { User } from 'src/modules/user/entities/user.entity';

export class RegisteredGameWithUserDto extends RegisteredGameWithGameDto {
  @IsNotEmpty()
  @Type(() => User)
  user: User;
}
