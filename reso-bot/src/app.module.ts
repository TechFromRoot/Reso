import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResoBotModule } from './reso-bot/reso-bot.module';
import { ResoAgentModule } from './reso-agent/reso-agent.module';

@Module({
  imports: [ResoBotModule, ResoAgentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
