import { Injectable } from '@nestjs/common';
import { CreateRegisteredGameDto } from './dto/create-registered-game.dto';
import { UpdateRegisteredGameDto } from './dto/update-registered-game.dto';

@Injectable()
export class RegisteredGameService {
  create(createRegisteredGameDto: CreateRegisteredGameDto) {
    return 'This action adds a new registeredGame';
  }

  findAll() {
    return `This action returns all registeredGame`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registeredGame`;
  }

  update(id: number, updateRegisteredGameDto: UpdateRegisteredGameDto) {
    return `This action updates a #${id} registeredGame`;
  }

  remove(id: number) {
    return `This action removes a #${id} registeredGame`;
  }
}
