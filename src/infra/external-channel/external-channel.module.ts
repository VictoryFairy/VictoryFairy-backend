import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { DiscordService } from './discord.service';

@Module({
  providers: [SlackService, DiscordService],
  exports: [SlackService, DiscordService],
})
export class ExternalChannelModule {}
