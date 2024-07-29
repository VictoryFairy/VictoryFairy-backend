import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RegisteredGameService } from 'src/services/registered-game.service';
import { CreateRegisteredGameDto } from './dto/create-registered-game.dto';
import { UpdateRegisteredGameDto } from './dto/update-registered-game.dto';

@Controller('registered-game')
export class RegisteredGameController {
  constructor(private readonly registeredGameService: RegisteredGameService) {}

  @Post()
  create(@Body() createRegisteredGameDto: CreateRegisteredGameDto) {
    return this.registeredGameService.create(createRegisteredGameDto);
  }

  @Get()
  findAll() {
    return this.registeredGameService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registeredGameService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegisteredGameDto: UpdateRegisteredGameDto) {
    return this.registeredGameService.update(+id, updateRegisteredGameDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registeredGameService.remove(+id);
  }
}
