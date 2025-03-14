import { Module } from '@nestjs/common';
import { ResoBotService } from './reso-bot.service';

@Module({
  providers: [ResoBotService]
})
export class ResoBotModule {}
