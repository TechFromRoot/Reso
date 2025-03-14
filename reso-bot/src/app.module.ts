import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResoBotModule } from './reso-bot/reso-bot.module';

@Module({
  imports: [ResoBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
